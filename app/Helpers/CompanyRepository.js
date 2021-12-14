'use strict';
//utils
const appInsights = require("applicationinsights");
const { auditFields, hiringAuthorityStatus, userRoles, companyType, EntityTypes, OperationType, DateFormats } = use('App/Helpers/Globals');
const Database = use('Database');
const { moveFile } = use('App/Helpers/FileHelper');
const Event = use('Event');
const EventType = use('App/Helpers/Events')
const { uniqBy,chunk } = use('lodash')
const EventTypes = use('App/Helpers/Events');
const CompanyType = use('App/Models/CompanyType');
const { fileType } = use('App/Helpers/FileType');
const moment = use('moment');
const Antl = use('Antl');

//Repositories
const LocationRepository = new (use('App/Helpers/LocationRepository'))();
const CandidateRepository = new (use('App/Helpers/CandidateRepository'))();
const NameRepository = new (use('App/Helpers/NameRepository'))();
const RecruiterRepository = new (require("./RecruiterRepository"))();
const FeeAgreementRepository = new (use('App/Helpers/FeeAgreementRepository'))();
const HiringAuthorityRepository = new (require("./HiringAuthorityRepository"))();
const UserRepository = new (require("./UserRepository"))();
const ModulePresetsConfigRepository = new (use('App/Helpers/ModulePresetsConfigRepository'))();

//Models
const Company = use('App/Models/Company');
const CompanyNote = use('App/Models/CompanyNote');
const CompanyActivityLog = use('App/Models/CompanyActivityLog');
const CompanyFeeAgreement = use('App/Models/CompanyFeeAgreement');
const Contact = use('App/Models/Contact');
const HiringAuthority = use('App/Models/HiringAuthority');
const CompanyRecruiterAssignment = use('App/Models/CompanyRecruiterAssignment');
const User = use('App/Models/User');
const HiringAuthorityHasCompany = use('App/Models/HiringAuthorityHasCompany');
const JobOrder = use('App/Models/JobOrder');
const CompanyTypeReassure = use('App/Models/CompanyTypeReassure');
const CompanyHasFile = use('App/Models/CompanyHasFile');
const CompanyChangeLog = use('App/Models/CompanyChangeLog');

class CompanyRepository {

  unWrapHiringAuthority = 
    ({
      id,
      first_name,
      last_name,
      title,
      personal_email,
      work_email,
      personal_phone,
      work_phone,
      ext,
      specialty_id,
      subspecialty_id,
      position_id
    }) => ({
        id,
        first_name,
        last_name,
        title,
        personal_email,
        work_email,
        personal_phone,
        work_phone,
        ext,
        specialty_id,
        subspecialty_id,
        position_id
      });

  /**
   * Creates a company
   *
   * @description When creating a company, employees can be passed so it will have employees when created
   *
   * @param {Number} dataToCreate - Company creation data
   * @param {Number} user_id - The user creating the company
   * @param {Number[]} candidateIds - The array of candidate ids, AKA employees
   * @param {Number[]} nameIds - The array of names ids, AKA employees
   *
   * @return {Object} An object containing the company created & a sucess message if everything went smoothly
   */
   async create(dataToCreate, user_id, candidateIds = [], nameIds = []) {
    const {
      name,
      address,
      phone,
      ext,
      email,
      website,
      link_profile,
      hiringAuthorities = [],
      fileId,
      specialty_id,
      subspecialty_id,
      feeAgreement,
    } = dataToCreate;

    // transaction
    let trx;

    try {
      // create address
      const { zip, city_id } = dataToCreate;
      const zipCode = await LocationRepository.existZipOnCity(zip, city_id);
      if (!zipCode) {
        return {
          success:false,
          code:400,
          message:"The zip code doesn't exist in the selected city"
        }
      }

      let { recruiter_id } = dataToCreate;
      const res = await RecruiterRepository.canAssign(recruiter_id, user_id);
      if (res.success) {
        recruiter_id = res.data;
      } else {
        return res;
      }

      const { latitude ,longitude  } = zipCode
      trx = await Database.beginTransaction();

      // create contact
      const contact = await Contact.create({ phone, ext }, trx);

      // upload Fee agreement
      let fee_agreement_url = null
      let fileTemp = null
      let file_name = null
      if( fileId && fileId != '' ){
        fileTemp = await Database.table('user_has_temp_files')
          .where('id', fileId)
          .where('user_id', user_id)
          .first();
        if(fileTemp) {
          fee_agreement_url = await moveFile(fileTemp.file_name, 'fee_agreements/' + fileTemp.file_name);
          file_name = fileTemp.original_name;
        }
      }

      // create company
      const company = await Company.create(
        {
          contact_id: contact.id,
          recruiter_id,
          name,
          email,
          website,
          link_profile,
          created_by: user_id,
          fee_agreement_url,
          file_name,
          created_by: user_id,
          updated_by: user_id,
          specialty_id,
          subspecialty_id,
          company_type_id: companyType.NotSigned,
          address,
          zip, 
          city_id,
          coordinates :`(${longitude},${latitude})`
        },
        trx
      );

      await CompanyRecruiterAssignment.create(
        { company_id: company.id, recruiter_id: company.recruiter_id, coach_id: user_id },
        trx
      );

      // create hiring authority
      if(hiringAuthorities.length > 0){
        const uniqHA = uniqBy(hiringAuthorities,'work_email');
        if(uniqHA.length !== hiringAuthorities.length){
          await trx.rollback();
          return {
            code: 400,
            success: false,
            message: 'You cannot use the same email for different hiring authorities' ,
          };
        }
      }
      const hiringAuthoritiesToCreate = [];
      let companyHiringAuthorities = [];
      for (const hiringAuthority of hiringAuthorities) {
        const hiringAuthorityData = this.unWrapHiringAuthority(hiringAuthority)
        if(hiringAuthorityData.id && !hiringAuthority.isContact) {
          const hiringExist = await HiringAuthority.find(hiringAuthorityData.id);
          if(!hiringExist) {
            await trx.rollback();
            return {
              success:false,
              code:400,
              message:`${hiringAuthorityData.first_name} ${hiringAuthorityData.last_name} does not exist as a Hiring Authority`
            }
          }
          await HiringAuthorityHasCompany.create({hiring_authority_id: hiringExist.id, company_id: company.id},trx);

          hiringExist.merge({
            specialty_id: hiringAuthorityData.specialty_id,
            subspecialty_id: hiringAuthorityData.subspecialty_id,
            position_id: hiringAuthorityData.position_id,
          });
          await hiringExist.save(trx);
          companyHiringAuthorities.push(hiringExist);
        }else if(hiringAuthority.isContact){
          delete hiringAuthorityData.id; 
          const res = await HiringAuthorityRepository.createFromName(hiringAuthority.id,{
            ...hiringAuthorityData,
            company_id: company.id
          },trx); 
          if(!res.success){
            await trx.rollback();
            return res;
          }
          companyHiringAuthorities.push(res.data);
        }else {
          hiringAuthoritiesToCreate.push({
            ...hiringAuthorityData,
            company_id: company.id,
            hiring_authority_status_id : hiringAuthorityStatus.Inactive
          });
        }
      }
      
      if (hiringAuthoritiesToCreate.length > 0) {
        const createdHiringAuthorities = (await HiringAuthority.createMany(hiringAuthoritiesToCreate, trx));
        companyHiringAuthorities = companyHiringAuthorities.concat(createdHiringAuthorities);
      }

      // Fee Agreement
      if(feeAgreement){

        const hiring = this.findHiringAuthority(feeAgreement.hiring_authority_email, companyHiringAuthorities);
        if(!hiring){
          await trx.rollback();
          return {
            success: false,
            code: 400,
            message: 'The provided hiring authority for the fee agreement does not exist'
          }
        }
        const feeAgreementToCreate = {
          ...feeAgreement,
          company_id: company.id,
          hiring_authority_id: hiring.id,
          creator_id: user_id
        };
        const createdFeeAgreement = await FeeAgreementRepository.create(feeAgreementToCreate, company, hiring, user_id, trx);
        if (!createdFeeAgreement.success) {
          await trx.rollback();
          return {
            success: false,
            code: 500,
            message: 'There was a problem creating the fee agreement, please try again later' 
          };
        }
      }

      //Employees section
      await this.createCompanyEmployees(company.id, candidateIds, nameIds, user_id, trx)
      await company.loadMany({
        candidateEmployees: (builder) => builder.transacting(trx).where('is_current_company', true),
        nameEmployees: (builder) => builder.transacting(trx).where('is_current_company', true),
      });

      //create transaction
      await trx.commit();

      const companyJson = company.toJSON();

      Event.fire(EventTypes.Company.Created, {
        company: companyJson,
        companyId: company.id,
        entity: EntityTypes.Company,
        operation: OperationType.Create,
        payload: { description: 'Company Created', dataToCreate, userId: user_id },
        userId: user_id,
        validationHelper: hiringAuthorities
      });

      return {
        code: 201,
        success:true,
        message: 'Company created successfull',
        data: companyJson
      };
    } catch (error) {
      appInsights.defaultClient.trackException({exception: error});
      trx && (await trx.rollback());

      return {
        code: 500,
        success: false,
        message: 'There was a problem creating the company, please try again later' ,
      };
    }
  }

  /**
   * Creates employees for a company
   *
   * @description This method allows to add/create employees for the company passed
   *
   * @param {Number} companyId - The company that the employees will be added to
   * @param {Number[]} candidateIds - Which candidates will be added as employees
   * @param {Number[]} nameIds - Which names will be added as employees
   * @param {Number} userId - Who is adding the employees
   * @param {Object!} trx - The transaction, needed since many items can be created
   *
   * @return {Object} An object containing the company created & a sucess message if everything went smoothly
   */
  async createCompanyEmployees(companyId, candidateIds = [], nameIds = [], userId, trx) {
    const candidateEmployeesPromises = [];
    for (const candidateId of candidateIds) {
      candidateEmployeesPromises.push(
        CandidateRepository.createEmployerRelationship(candidateId, companyId, true, userId, trx)
      );
    }
    const candidateEmployees = await Promise.all(candidateEmployeesPromises);

    const nameEmployeesPromises = [];
    for (const nameId of nameIds) {
      nameEmployeesPromises.push(
        NameRepository.createEmployerRelationship(nameId, companyId, true, userId, trx)
      );
    }
    const nameEmployees = await Promise.all(nameEmployeesPromises);

    return { candidateEmployees, nameEmployees };
  }

  findHiringAuthority = (email, hiringAuthorities) => {
    for(const hiringAuthority of hiringAuthorities) {
      const ha = hiringAuthority.toJSON();
      if (email === ha.work_email) {
        return hiringAuthority;
      }
    }
    return null;
  };

  async update(params, request, user_id){
    const company = await Company.findOrFail(params.id);
    const contact = await Contact.findByOrFail('id', company.contact_id);

    // company
    const {
      name,
      address,
      phone,
      ext,
      email,
      website,
      link_profile,
      specialty_id,
      subspecialty_id,
      company_type_id,
      zip, 
      city_id
    } = request;

    // transaction
    let trx;

    try {
      // Create address

      const zipCode = await LocationRepository.existZipOnCity(zip, city_id);
      if (!zipCode) {
        return {
          success:false,
          code:400,
          message:"The zip code doesn't exist in the selected city"
        }
      }
      trx = await Database.beginTransaction();
      const { latitude ,longitude  } = zipCode


      // Create contact
      await contact.merge({ phone, ext });
      await contact.save(trx);

      // Create company
      const companyDataToUpdate = {
        contact_id: contact.id,
        name,
        email,
        website: website,
        link_profile: link_profile,
        updated_by: user_id,
        specialty_id,
        subspecialty_id,
        address, 
        zip ,
        city_id,
        coordinates :`(${longitude},${latitude})`
      };

      const { hasAtLeastOne } = await UserRepository.hasRoles(user_id, [userRoles.DataCoordinator, userRoles.Operations]);
      if (hasAtLeastOne) {
        companyDataToUpdate.company_type_id = company_type_id;
      }
      await company.merge(companyDataToUpdate);
      await company.save(trx);

      // create transaction
      await trx.commit();
      Event.fire(EventTypes.Company.Updated, {
        companyId: company.id,
        entity: EntityTypes.Company,
        operation: OperationType.Update,
        payload: { description: 'Company Updated', request, userId: user_id },
        userId: user_id,
      });

      const updatedCompany = await this.details(params.id,true);

      return {
        success:true,
        code:201,
        data : updatedCompany
      }
    } catch (err) {
      appInsights.defaultClient.trackException({exception: err});

      // create rollback and close transaction
      trx && (await trx.rollback());

      return {
        success:false,
        code:500,
        message: 'There was a problem updating the company, please try again later' 
      };
    }
  }

  async createNote(req, companyId,user_id) {
    const {  body ,title } = req; 
    const company = await Company.find(companyId);
    if (!company) {
      return {
        success: false,
        code: 404,
        message: 'Company not found'
      };
    }
    try {
      const companyNote = await CompanyNote.create({
        body,
        title,
        user_id,
        company_id: companyId
      });

      Event.fire(EventTypes.Company.NoteCreated, {
        companyId,
        entity: EntityTypes.Note,
        operation: OperationType.Create,
        payload: { description: 'Company Note Created', req, noteId: companyNote.id, userId: user_id },
        userId: user_id,
      });

      await companyNote.load('user',builder=>{
        builder.setHidden([
          'personal_information_id',
          'user_id',
          'double_authentication',
          'step_wizard',
          'user_status_id',
          ...auditFields]);
      })
      return {
        success: true,
        code: 201,
        data: companyNote
      };
    } catch (error) {
      appInsights.defaultClient.trackException({exception: error});

      return {
        success: false,
        code: 500,
        message: 'There was a problem creating the Company note, please try again later' 
      };
    }

  }

  async updateNote(req,noteId,companyId,user_id){
    const { body, title } = req; 
    const companyNote = await CompanyNote.query()
      .where('id', noteId)
      .where('company_id', companyId)
      .first();
    if (!companyNote) {
      return {
        success: false,
        code: 404,
        message: 'Note not found' 
      };
    }
    if(companyNote.user_id != user_id){
      return {
        success: false,
        code: 403,
        isInactive:false,
        redirect:false,
        message: "You don't have the permission required to use the resource",
      };
    }
    try {
      await companyNote.merge({body,title});
      await companyNote.save();

      Event.fire(EventTypes.Company.NoteUpdated, {
        companyId,
        entity: EntityTypes.Note,
        operation: OperationType.Update,
        payload: { description: 'Company Note Updated', noteId, req, userId: user_id },
        userId: user_id,
      });

      await companyNote.load('user',builder=>{
        builder.setHidden([
          'personal_information_id',
          'user_id',
          'double_authentication',
          'step_wizard',
          'user_status_id',
          ...auditFields]);
      })
      return {
        success: true,
        code: 201,
        data: companyNote
      };
    } catch (error) {
      appInsights.defaultClient.trackException({exception: error});

      return {
        success: false,
        code: 500,
        message: 'There was a problem updating the Company note, please try again later' 
      };
    }
  }

  
  async deleteNote(noteId, companyId,user_id) {
    const companyNote = await CompanyNote.query()
      .where('id', noteId)
      .where('company_id', companyId)
      .first();
    if (!companyNote) {
      return {
        success: false,
        code: 404,
        message: 'Note not found' 
      };
    }
    if(companyNote.user_id != user_id){
      return {
        success: false,
        code: 403,
        isInactive:false,
        redirect:false,
        message: "You don't have the permission required to use the resource",
      };
    }
    try {
      await companyNote.delete();

      Event.fire(EventTypes.Company.NoteDeleted, {
        companyId,
        entity: EntityTypes.Note,
        operation: OperationType.Delete,
        payload: { description: 'Company Note Deleted', noteId, userId: user_id },
        userId: user_id,
      });

      return {
        success: true,
        code: 200,
        message: 'Note deleted succesfully!'
      };
    } catch (error) {
      appInsights.defaultClient.trackException({exception: error});

      return {
        success: false,
        code: 500,
        message: 'There was a problem deleting the Company note, please try again later' 
      };
    }
  }

  /**
   * Returns a custom response that determines
   * the creation of an activity
   *
   * @param {String} body
   * @param {Integer} activityLogTypeId
   * @param {Integer} companyId
   * @param {Integer} userId
   * @param {Object} optionalParams - An object that contains optional/extra params, trying not to put too many unnecessaries params
   *
   * @return {Object} A success with a code 201 and the activity  or an error code
   */
  async createActivityLog(body, activityLogTypeId, companyId, userId, optionalParams = {}) {
    const company = await Company.find(companyId);
    if (!company) {
      return {
        success: false,
        code: 404,
        message: 'Company not found' 
      };
    }
    const {
      metadata = {},
      createdBySystem = false,
      dateUpdated = null,
    } = optionalParams

    try {
      const companyActivityLog = await CompanyActivityLog.create({
        body,
        user_id: userId,
        activity_log_type_id: activityLogTypeId,
        company_id: companyId,
        created_by_system: createdBySystem,
        metadata,
      });

      // FOR UPDATING DATE IF IT'S AN ACT LOG FROM RC API
      if(dateUpdated){
        companyActivityLog.merge({ created_at: dateUpdated });
        await companyActivityLog.save();
      }

      await this.updateActivityDate(company, { useNowAsDate: true });
      await companyActivityLog.loadMany({
        'activityLogType': (builder) =>  builder.setHidden(auditFields),
        'user':  (builder) =>  
          builder.setHidden([
            'personal_information_id',
            'user_id',
            'double_authentication',
            'step_wizard',
            'user_status_id',
            'email_signature',
            ...auditFields])
      });
      Event.fire(EventTypes.Company.ActivityCreated, {
        companyId,
        entity: EntityTypes.Activity,
        operation: OperationType.Create,
        payload: { description: 'Company Activity Created', body, activityLogTypeId, activityLogId: companyActivityLog.id, userId: userId },
        userId: userId,
      });

      const result = companyActivityLog.toJSON();
      delete result.metadata;

      return {
        success: true,
        code: 201,
        data: result
      };
    } catch (error) {
      appInsights.defaultClient.trackException({exception: error});

      return {
        success: false,
        code: 500,
        message: 'There was a problem creating the Company activity, please try again later' 
      };
    }
  }

  async updateActivityLog(req, activityLogId, companyId, user_id) {
    const {  body,activity_log_type_id } = req; 
    const companyActivityLog = await CompanyActivityLog.query()
      .where('id', activityLogId)
      .where('company_id', companyId)
      .first();

    if (!companyActivityLog) {
      return {
        success: false,
        code: 404,
        message: 'ActivityLog not found'
      };
    }

    if(companyActivityLog.user_id!=user_id){
      return {
        success: false,
        code: 403,
        isInactive:false,
        redirect:false,
        message: "You don't have the permission required to use the resource",
      };
    }

    if (companyActivityLog.created_by_system) {
      return {
        success: false,
        code: 409,
        message: Antl.formatMessage('messages.error.activityFromSystem'),
      };
    }

    try {
      await companyActivityLog.merge({body,activity_log_type_id});
      await companyActivityLog.save();
      await companyActivityLog.loadMany({
        'activityLogType': (builder) =>  builder.setHidden(auditFields),
        'user':  (builder) =>  
          builder.setHidden([
            'personal_information_id',
            'user_id',
            'double_authentication',
            'step_wizard',
            'user_status_id',
            ...auditFields])
      });
      Event.fire(EventTypes.Company.ActivityUpdated, {
        companyId,
        entity: EntityTypes.Activity,
        operation: OperationType.Update,
        payload: { description: 'Company Activity Updated', req, activityLogId, userId: user_id },
        userId: user_id,
      });
      return {
        success: true,
        code: 201,
        data: companyActivityLog
      };
    } catch (error) {
      appInsights.defaultClient.trackException({exception: error});

      return {
        success: false,
        code: 500,
        message: 'There was a problem updating the Company activity, please try again later' 
      };
    }
  }

  async deleteActivityLog(activityLogId, companyId, user_id) {
    const companyActivityLog = await CompanyActivityLog.query()
      .where('id', activityLogId)
      .where('company_id', companyId)
      .first();
    if (!companyActivityLog) {
      return {
        success: false,
        code: 404,
        message: 'ActivityLog not found' 
      };
    }

    if(companyActivityLog.user_id!=user_id){
      return {
        success: false,
        code: 403,
        isInactive:false,
        redirect:false,
        message: "You don't have the permission required to use the resource",
      };
    }

    if (companyActivityLog.created_by_system) {
      return {
        success: false,
        code: 409,
        message: Antl.formatMessage('messages.error.activityFromSystem'),
      };
    }
    
    try {
      await companyActivityLog.delete();
      Event.fire(EventTypes.Company.ActivityDeleted, {
        companyId,
        entity: EntityTypes.Activity,
        operation: OperationType.Delete,
        payload: { description: 'Company Activity Deleted', activityLogId, userId: user_id },
        userId: user_id,
      });
      await this.updateActivityDate(await Company.find(companyId))
      return {
        success: true,
        code: 200,
        message: 'ActivityLog deleted succesfully!'
      };
    } catch (error) {
      appInsights.defaultClient.trackException({exception: error});

      return {
        success: false,
        code: 500,
        message: 'There was a problem delete the Company activity, please try again later' 
      };
    }
  }

  /**
   * Updates the last activity date for a company
   *
   * @method updateActivityDate
   *
   * @param {Database} company - The database object
   * @param {Date} useNowAsDate - Allows the method to use now as last activity date, expected to be used when an insert/update will result in the last activity date to be technically a now(), but a few ms apart, improving performance
   */
  async updateActivityDate(company, { useNowAsDate = false } = {}){
    const last_activity_date = useNowAsDate ? 'now()' : (await this.getLastActivityDate(company.id));

    await company.merge({ last_activity_date });
    await company.save();
  }

  async getLastActivityDate(companyId){
    const result = await CompanyActivityLog.query()
      .where('company_id', companyId)
      .max('created_at');
    return result.length>0 ? result[0].max : null;
  }
  
  /**
   * Small version of details
   *
   * @summary Expected to be used when only the very, very, very basic information is needed
   *
   * @param {Number} companyId - What company was updated
   *
   * @return {Object} Company found
   */
  async simpleDetails(companyId) {
    const company = await Company.query().with('assignedRecruiters').where('id', companyId).first();

    if (company) return company.toJSON();

    return false;
  }

  /**
   * Returns the reassure info
   *
   * @summary Returns the informations from a reassure
   *
   * @param {Number} companyTypeReassureId - What reassure is wanted
   *
   * @return {Object} Reassure found
   */
  async typeReassureDetails(companyTypeReassureId) {
    const companyTypeReassure = await CompanyTypeReassure.query().where('id', companyTypeReassureId).first();

    if (companyTypeReassure) return companyTypeReassure.toJSON();

    return false;
  }

  /**
   * Returns the information for the Ops modal about a type reassure
   *
   * @summary The information neccesary for the Ops verification modal
   *
   * @param {Number} userId - The user wanting the information
   * @param {Number} companyId - The company
   * @param {Number} companyTypeReassureId - What reassure is wanted
   *
   * @return {Object} Reassure found
   */
  async getTypeReassureInformation(userId, companyId, companyTypeReassureId) {
    const reassureCanBeVerified = await this.shouldOpsVerifyReassure(userId, companyTypeReassureId, companyId);
    if (!reassureCanBeVerified) {
      return {
        success: false,
        code: 409,
        message: 'The request has been already verified',
      };
    }

    const companyTypeReassure = await CompanyTypeReassure.query()
      .where('id', companyTypeReassureId)
      .where('company_id', companyId)
      .first();

    const userRequestorInformation = await User.query()
      .withPersonalInformation()
      .where('id', companyTypeReassure.user_id)
      .first();

    const requestInformation = await this.getCompanyTypeDetails(companyTypeReassure.company_type_id);

    const result = {
      requestor: userRequestorInformation.toJSON(),
      request: requestInformation,
    };

    return {
      code: 200,
      success: true,
      data: result,
    };
  }

  /**
   * Return types information
   *
   * @summary Return the type name, color & other information
   *
   * @param {Number} companyTypeId - The type searching
   *
   * @return {Object} Company found
   */
  async getCompanyTypeDetails(companyTypeId) {
    const company = await CompanyType.query().where('id', companyTypeId).first();

    if (company) return company.toJSON();

    return false;
  }

  async details(id, allDetails, userId = null) {
    const query = Company.query();
    query
      .where({ id })
      .setHidden(['industry_id', 'specialty_id','subspecialty_id', 'contact_id', 'address_id', 'recruiter_id', 'updated_at', 'updated_by'])
      .with('type', builder => builder.select(['id', 'title', 'color']))
      .with('specialty', (builder) => {
        builder.setHidden(['industry_id', ...auditFields]);
        builder.with('industry', (builder) => {
          builder.setHidden(auditFields);
        })
      })
      .with('subspecialty', (builder) => {
        builder.setHidden(auditFields);
      })
      .with('contact', builder => {
        builder.select(['id', 'phone', 'ext']);
      })
      .with('city', builder => {
        builder.setHidden(['state_id', 'created_at', 'updated_at']).with('state', builder => {
          builder.setHidden(['country_id', ...auditFields]);
          builder.with('country', (builder) => {
            builder.setHidden(auditFields);
          });
        });
      })
      .with('recruiter', builder => {
        builder
          .setHidden([
            'personal_information_id',
            'created_at',
            'updated_at',
            'avatar',
            'double_authentication',
            'step_wizard',
            'role_id',
            'user_status_id'
          ])
          .with('personalInformation', builder => {
            builder.setHidden(['contact_id', 'personal_information_id', ...auditFields]);
            builder.with('contact', builder => {
              builder.setHidden(['created_at', 'updated_at', 'created_by', 'updated_by']);
            });
          });
      })
      .with('createdBy', builder => {
        builder
          .setHidden([
            'personal_information_id',
            'created_at',
            'updated_at',
            'avatar',
            'double_authentication',
            'step_wizard',
            'token_notification',
            'role_id',
            'user_status_id'
            , ...auditFields
          ])
          .with('personalInformation', builder => {
            builder.setHidden(['contact_id', 'personal_information_id','address_id', ...auditFields]);
          });
      });
    if (allDetails) {
      this.withAllListings(query);
    }
    const company = await query.fetch();
    if (!company.rows[0]) {
      return null;
    }
    const companyJSON = company.rows[0].toJSON();
    companyJSON.hiringAuthorities =  companyJSON
    ? [
        ...(companyJSON.otherHiringAuthorities ? companyJSON.otherHiringAuthorities : []),
        ...(companyJSON.hiringAuthorities ? companyJSON.hiringAuthorities : []),
      ]
    : [];
    const coach = await RecruiterRepository.getCoachInfoByRecruiterId(companyJSON.recruiter.id);

    const companyTypeReassure = {
      shouldAskRecruiter: await this.shouldRecruiterReassureStatus(id, userId),
      inProgress: await this.reassureInProgress(id, userId), //Is there any request already in progress?
      recruiterCanRequest: await this.canRecruiterRequestReassure(id, userId), ///I mean, can even the user request this?
    };

    const result = {
      ...companyJSON  ,
      coach: coach || null,
      companyTypeReassure,
      address: {
        address: companyJSON.address,
        zip: companyJSON.zip,
        city: companyJSON.city,
        city_id: companyJSON.city ? companyJSON.city.id : null,
        coordinates: companyJSON.coordinates
      }
    };

    return result;
  }

  /**
   * Returns wether or not the recruiter should reassure the company type
   *
   * @description For a better data integrity, if a company is unsigned & a qualifed recruiter enters the company's profile, a modal should ask the user to reassure the company type, only one time
   *
   * @param {Number} companyId - The company being visited
   * @param {Number} userId - The user visting the company's profile
   *
   * @return {Boolean} If the user should reassure or not the company profile
   */
  async shouldRecruiterReassureStatus(companyId, userId) {
    const rawCompany = await Company.query().where('id', companyId).with('assignedRecruiters').first();
    if (!rawCompany) return false;

    const company = rawCompany.toJSON();

    const companyTypeModalConfig = await ModulePresetsConfigRepository.getById('companyTypeModal');
    const stopAskingDate = new Date(companyTypeModalConfig.data.stopAskingDate);
    const companyCreationDate = new Date(company.created_at);

    if (companyCreationDate > stopAskingDate) return false;

    const recruiterIsAssigned =
      company.created_by === userId ||
      company.recruiter_id === userId ||
      company.assignedRecruiters.some((row) => row.recruiter_id === userId || row.coach_id === userId);
    
    const companyIsNotSigned = company.company_type_id === companyType.NotSigned

    if (recruiterIsAssigned && companyIsNotSigned) {
      const hasBeenAsked = await CompanyTypeReassure.query().where('company_id', companyId).first();
      if(!hasBeenAsked) return true;
    }

    return false;
  }

  /**
   * Returns wether or not the company has a reassure in progress
   *
   * @description Allow to quickly know if there is a reassure in progress, which can be know since there is a request that hasn't been verified yet
   *
   * @param {Number} companyId - The company being visited
   * @param {Number} userId - The user visting the company's profile
   *
   * @return {Boolean} If the user should reassure or not the company profile
   */
  async reassureInProgress(companyId, userId) {
    const rawCompany = await Company.query().where('id', companyId).with('assignedRecruiters').first();
    if (!rawCompany) return false;
    const company = rawCompany.toJSON();

    const recruiterIsAssigned =
      company.created_by === userId ||
      company.recruiter_id === userId ||
      company.assignedRecruiters.some((row) => row.recruiter_id === userId || row.coach_id === userId);

    const reassureInProgress = await CompanyTypeReassure.query()
      .isVerified(false)
      .where('company_id', companyId)
      .first();

    if (!recruiterIsAssigned || !reassureInProgress) return null;

    const reassureInProgressInformation = {
      reassureId: reassureInProgress.id,
      companyTypeId: reassureInProgress.company_type_id,
    };

    return reassureInProgressInformation;
  }

  /**
   * Returns wether or not the user can request a reassure for that company
   *
   * @description A reassure can be only requested if the candidate is assigned & the company has a not signed status
   *
   * @param {Number} companyId - The company being visited
   * @param {Number} userId - The user visting the company's profile
   *
   * @return {Boolean} If the user should reassure or not the company profile
   */
  async canRecruiterRequestReassure(companyId, userId) {
    const rawCompany = await Company.query().where('id', companyId).with('assignedRecruiters').first();
    if (!rawCompany) return false;
    const company = rawCompany.toJSON();

    const recruiterIsAssigned =
      company.created_by === userId ||
      company.recruiter_id === userId ||
      company.assignedRecruiters.some((row) => row.recruiter_id === userId || row.coach_id === userId);

    const companyIsNotSigned = company.company_type_id === companyType.NotSigned;// ATM, recruiter could request with any type whatsoever

    if (recruiterIsAssigned) return true;

    return false;
  }

  /**
   * Creates a company type reassure
   *
   * @description When a user wants to reassure a company, this method should be used, it creates a reassure, it only alerts ops that they should check this company type, only works if @method shouldRecruiterReassureStatus returns true
   *
   * @param {Number} companyId - The company being visited
   * @param {Number} userId - The user visting the company's profile
   * @param {Number} companyTypeId - The expected company type id
   *
   * @return {Object} The company reassure
   */
  async storeCompanyTypeReassure(companyId, userId, companyTypeId) {
    const userCanReassure = await this.canRecruiterRequestReassure(companyId, userId);
    if (!userCanReassure) {
      return {
        code: 409,
        success: false,
        message: 'You cannot reassure the company type',
      };
    }

    const { hasAtLeastOne: isCoach } = await UserRepository.hasRoles(userId, [userRoles.Coach]);
    
    const trx = await Database.beginTransaction();
    try {
      let result = {
        companyTypeReassure: null,
        companyInformation: null,
      };

      const companyTypeReassure = await CompanyTypeReassure.create(
        {
          company_id: companyId,
          company_type_id: companyTypeId,
          user_id: userId,
          is_coach_reassure: isCoach
        },
        trx
      );

      await trx.commit();

      result.companyTypeReassure = companyTypeReassure;

      Event.fire(EventTypes.Company.Reassured, {
        companyId,
        companyTypeId,
        companyTypeReassureId: companyTypeReassure.id,
        entity: EntityTypes.Company,
        operation: OperationType.Update,
        payload: { description: 'Company Reassured', companyId, userId, companyTypeId },
        userId,
      });

      result.companyInformation = await this.details(companyId, true, userId);

      return {
        code: 200,
        success: true,
        data: result,
      };
    } catch (error) {
      trx && (await trx.rollback());
      appInsights.defaultClient.trackException({ exception: error });

      return {
        code: 500,
        success: false,
        message: 'There was a problem while reassuring the company type',
      };
    }
  }

  /**
   * Creates a company type reassure
   *
   * @description This method only updates those company type reassures that are pending
   *
   * @param {Number} companyId - The company which the reassure started on
   * @param {Number} userId - The user which is requesting the update
   * @param {Number} companyTypeId - The new company type id that the reassure will change to
   * @param {Number} companyTypeReassureId - The reassure that will be update - MUST BE NOT VERIFIED! otherwise it cannot be updated
   *
   * @return {Object} The company reassure
   */
  async updatePendingTypeReassure(companyId, userId, companyTypeId, companyTypeReassureId) {
    try {
      const pendingReassure = await CompanyTypeReassure.query()
        .isVerified(false)
        .where('id', companyTypeReassureId)
        .where('company_id', companyId)
        .first();
      if (!pendingReassure) {
        return {
          code: 404,
          success: false,
          message: Antl.formatMessage('messages.error.notFound', { entity: 'pending company type reassure' }),
        };
      }

      const userCanReassure = await this.canRecruiterRequestReassure(companyId, userId);
      if (!userCanReassure) {
        return {
          code: 409,
          success: false,
          message: 'You cannot update the pending company type reassure',
        };
      }

      await pendingReassure.merge({
        company_type_id: companyTypeId,
        user_id: userId,
      });

      await pendingReassure.save();

      Event.fire(EventTypes.Company.PendingReassureUpdated, {
        companyId,
        companyTypeId,
        companyTypeReassureId,
        entity: EntityTypes.Company,
        operation: OperationType.Update,
        payload: { description: 'Company Reassure Updated', companyId, userId, companyTypeId },
        userId,
      });

      return {
        code: 200,
        success: true
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      return {
        code: 500,
        success: false,
        message: 'There was a problem while reassuring the company type',
      };
    }
  }

  /**
   * Log a company change
   *
   * @method logChange
   * 
   * @description Use this whenver a change is made to a company & is deemed important to record in the audit trail
   *
   * @param {Number} companyId - The company that suffered the change
   * @param {String} entity - What changed in the company (type, ..., etc)
   * @param {String} operation - Related operation (create, update, delete)
   * @param {Object} payload - Content of the changed object
   * @param {Number} userId - Who made the change
   *
   */
  async logChange(companyId, entity, operation, payload, userId) {
    try {
      await CompanyChangeLog.create({
        company_id: companyId,
        entity,
        operation,
        payload,
        created_by: userId,
      });
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
    }
  }

  /**
   * Returns wether or not the ops should verify the reassure passed
   *
   * @description If a reassure has been already verified, it cannot be changed furthermore
   *
   * @param {Number} userId - The user checking if he can verify that reassure
   * @param {Number} companyTypeReassureId - What reassure is being verified
   * @param {Number} companyId - The company the reassure belongs to
   *
   * @return {Boolean} If the user should verify the reassure or not
   */
  async shouldOpsVerifyReassure(userId, companyTypeReassureId, companyId) {
    const { hasAtLeastOne: isOps } = await UserRepository.hasRoles(userId, [userRoles.Operations]);
    if (!isOps) return false;

    const companyTypeReassure = await CompanyTypeReassure.query()
      .where('id', companyTypeReassureId)
      .where('company_id', companyId)
      .isVerified(false)
      .first();
    if (!companyTypeReassure) return false;

    return true;
  }

  /**
   * Returns the pending reassures the company has
   *
   * @description While only one reassure should be pending, all the ones a company has are returned, of course it is checked if the user can even see them
   *
   * @param {Number} userId - The user checking if there are reassures, needs to be OPS
   * @param {Number} companyId - The company from where the reassures should belong to
   *
   * @return {Object[]} The pending reassures
   */
  async getPendingReassures(userId, companyId) {
    const { hasAtLeastOne: isOps } = await UserRepository.hasRoles(userId, [userRoles.Operations]);
    if (!isOps) return false;

    const pendingReassuresRaw = await CompanyTypeReassure.query()
      .where('company_id', companyId)
      .isVerified(false)
      .fetch();

    const pendingReassures = pendingReassuresRaw.toJSON().map((row) => row.id);

    return { succes: true, code: 200, data: pendingReassures };
  }

  /**
   * Creates a company type reassure ops verification
   *
   * @description This method is the followup from @method storeCompanyTypeReassure but this part is from ops team, this allows to change the company type, store the log for that change & alert the recruiter that indeed, his reassure was valid (or not)
   *
   * @param {Number} companyId - The company that was asked to be verified
   * @param {Number} userId - The user (ops) verifying
   * @param {Number} fileId - The fee agreement, passed as an attachment
   * @param {Number} companyTypeId - The company type that Ops selected
   * @param {Number} companyTypeReassureId - The reassure reference, belongs to the 'part one' of this flow
   *
   * @return {Object} The company reassure verficated
   */
  async storeCompanyTypeReassureOpsVerification(companyId, userId, fileId, companyTypeId, companyTypeReassureId) {
    let trx = null;
    try {
      let result = {
        companyTypeReassure: null,
        companyInformation: null,
      };

      const reassureCanBeVerified = await this.shouldOpsVerifyReassure(userId, companyTypeReassureId, companyId);
      if (!reassureCanBeVerified) {
        return {
          success: false,
          code: 409,
          message: 'The request has been already verified',
        };
      }

      trx = await Database.beginTransaction();
      const companyTypeReassure = await CompanyTypeReassure.query(trx).where('id', companyTypeReassureId).where('company_id', companyId).first();

      //Create attachment
      let company_has_file_id = null;
      if (fileId && fileId !== '') {
        const fileTemp = await Database.table('user_has_temp_files')
          .where('id', fileId)
          .where('user_id', userId)
          .first();
        if (fileTemp) {
          const url = await moveFile(fileTemp.file_name, 'attachments/' + fileTemp.file_name);
          const file_name = fileTemp.original_name;
          const companyFile = await CompanyHasFile.create(
            {
              company_id: companyId,
              file_type_id: await fileType('FEEAGREEMENT'),
              url,
              file_name,
              created_by: userId,
            },
            trx
          );
          result.file = companyFile;
          company_has_file_id = companyFile.id;
        }
      }

      await companyTypeReassure.merge({
        verification_date: new Date(),
        verified_by: userId,
        verified_company_type_id: companyTypeId,
        company_has_file_id,
      });
      await companyTypeReassure.save(trx);

      const company = await Company.query().transacting(trx).where('id', companyId).first();
      await company.merge({ company_type_id: companyTypeId });
      await company.save(trx);

      await trx.commit();

      result.companyTypeReassure = companyTypeReassure;

      const sameTypeAsRequested = companyTypeReassure.company_type_id === companyTypeReassure.verified_company_type_id;

      Event.fire(EventTypes.Company.ReassureVerified, {
        userId,
        companyId,
        companyTypeId,
        companyTypeReassureId: companyTypeReassure.id,
        sameTypeAsRequested,
        entity: EntityTypes.Company,
        operation: OperationType.Update,
        payload: { description: 'Company Reassure Verified', companyId, userId, companyTypeId },
      });

      result.companyInformation = await this.details(companyId, true, userId);

      return {
        code: 200,
        success: true,
        data: result,
      };
    } catch (error) {
      trx && (await trx.rollback());
      appInsights.defaultClient.trackException({ exception: error });

      return {
        code: 500,
        success: false,
        message: 'There was a problem while verifying the company type change request',
      };
    }
  }

  async withSendouts(id) {
    const query = await Database.table('companies as cp')
      .select([
        'so.id',
        'sos.style',
        'cp.name',
        'jo.title as functional_title',
        'cp.name as company_name',
        'ws.good_compensation as fee_amount',
        'so.created_at as created_at'
      ])
      .innerJoin('job_orders as jo', 'cp.id', 'jo.company_id')
      .innerJoin('sendouts as so', 'jo.id', 'so.job_order_id')
      .leftJoin('sendout_statuses as sos', 'so.status_id', 'sos.id')
      .leftJoin('white_sheets as ws', 'jo.id', 'ws.job_order_id')
      .where('cp.id', id);
    return query;
  }

  async withAllListings(query) {
    query
      .with('files', builder => {
        builder.setHidden(['file_type_id', 'company_id']);
          builder.with('fileType', builder => {
          builder.setHidden(auditFields);
        });
      })
      .with('feeAgreements', builder => {
        builder.with('feeAgreementStatus', builder => {
          builder.select(['id', 'internal_name', 'style_class_name']);
        })
        builder.with('feeAgreementStatus.group', builder => {
          builder.select(['id', 'title', 'style_class_name']);
        })
        .with('hiringAuthority', builder => {
          builder.select(['id', 'work_email', 'full_name'])
        })
        .with('creator')
        .with('creator.personalInformation');
        builder.whereRaw('fee_agreement_status_id not in (select id from fee_agreement_statuses where hidden)');
      })
      .with('hiringAuthorities', builder => {
        builder
        .with('specialty', (builder) => {
          builder.setHidden([...auditFields]);
          builder.with('industry', (builder) => {
            builder.setHidden(auditFields);
          })
        })        
        .with('subspecialty')
        .with('position')
        .setHidden(['company_id', 'created_at', 'updated_at', 'created_by', 'updated_by']);
      })
      .with('otherHiringAuthorities', builder => {
        builder
        .with('specialty', (builder) => {
          builder.setHidden([...auditFields]);
          builder.with('industry', (builder) => {
            builder.setHidden(auditFields);
          })
        })        
        .with('subspecialty')
        .with('position')
        .setHidden(['company_id', 'created_at', 'updated_at', 'created_by', 'updated_by']);
      })
      .with('jobOrders', this.applyDefaultJobOrdersScope)
      .with('notes', builder => {
        builder.setHidden(['company_id', 'user_id']);
        builder.orderBy('created_at','desc')
        builder.with('user', builder => {
          builder.setHidden([
            'avatar',
            'double_authentication',
            'step_wizard',
            'personal_information_id',
            'user_status_id',
            ...auditFields
          ]);
        });
      })
      .with('activityLogs', builder => {
        builder.setHidden(['company_id', 'user_id']);
        builder.orderBy('created_at','desc')
        builder.with('activityLogType', builder => {
          builder.setHidden(auditFields);
        });
        builder.with('user', builder => {
          builder.setHidden([
            'avatar',
            'double_authentication',
            'step_wizard',
            'personal_information_id',
            'user_status_id',
            ...auditFields
          ]);
        });
      });
  }
  
  async getLastActivity(companyId) {
    if (!Number.isInteger(Number(companyId))) {
      throw { message: 'Parameter companyId must be an integer'}
    }
    const query = Database
      .select([
        'alt.title',
        'cal.created_at as date',
        'pi.full_name as user'
      ])
      .from('company_activity_logs as cal')
      .leftJoin('activity_log_types as alt', 'cal.activity_log_type_id', 'alt.id')
      .leftJoin('users', 'cal.user_id', 'users.id')
      .leftJoin('personal_informations as pi', 'users.personal_information_id', 'pi.id')
      .where('company_id', companyId)
      .whereRaw('cal.created_at = (select max(created_at) from company_activity_logs where company_id = ?)', [companyId]);
    return await query.first();
  }

  async createHiringAuthority(companyId, data, nameId) {
    try {
      let hiringAuthority;
      const company = await Company.find(companyId);
      if (!company) {
        return {
          code: 201,
          success: true,
          message: 'Company not found'
        }
      }
      const hiringAuthorityData = {
        company_id: companyId,
        ...data
      };
      if(nameId){
        const res = await HiringAuthorityRepository.createFromName(nameId,{
          company_id: companyId,
        ...data
        },null); 
        if(!res.succes){
          return res;
        }
        hiringAuthority = res.data;
      }else{
        hiringAuthority = await HiringAuthority.create(hiringAuthorityData);
      }
      
      const result = await HiringAuthority.find(hiringAuthority.id);
      await result.loadMany([
        'company',
        'specialty',
        'subspecialty',
        'position',
        'specialty.industry',
        'hiringAuthorityStatus'
      ]);
      Event.fire(EventType.HiringAuthority.Created, {hiringAuthority});
      return {
        code: 201,
        success: true,
        data: result
      }
    } catch (err) {
      appInsights.defaultClient.trackException({ exception: err });
      
      return {
        code: 500,
        success: false,
        message: 'There was a problem creating the hiring authority, please try again later' 
      }
    }
  }


  async createFeeAgreementFromProfile(companyId, userId, feeAgreementData) {
    let trx;
    try {
      const { hiring_authority_email } = feeAgreementData;
      const company = await Company.find(companyId);

      if(!company){
        return {
          success: false,
          code: 400,
          message: 'Company not found'
        }
      }

      const hiring = await HiringAuthority.query()
        .where('work_email',hiring_authority_email)
        .first();
      if(!hiring){
        return {
          success: false,
          code: 400,
          message:  'Hiring Authority not Found'
        }
      }
      const isAssignedToCompany = HiringAuthorityRepository.isHiringAuthorityAssignedToCompany(hiring.id, company.id);
      
      if(!isAssignedToCompany){
        return {
          success: false,
          code: 400,
          message:  'Hiring Authority not found in the company'
        }
      }
      trx = await Database.beginTransaction();
      const feeAgreement = await FeeAgreementRepository.create(feeAgreementData, company, hiring, userId , trx);
      if (!feeAgreement.success) {
        await trx.rollback();
        return feeAgreement;
      }
      //create transaction
      await trx.commit();
      await FeeAgreementRepository.loadRelations(feeAgreement.data);

      return {
        code: 201,
        success:true,
        message: 'Fee Agreement created successfully!',
        data: feeAgreement.data
      };
    } catch (error) {
      appInsights.defaultClient.trackException({exception: error});
      if (trx) {
       await trx.rollback();
      }
      throw error;
    }

  }


  async createUnManagedFeeAgreement(companyId, userId, feeAgreementData) {
    let trx;
    try {
      const { hiring_authority_email } = feeAgreementData;
      const company = await Company.find(companyId);

      if(!company){
        return {
          success: false,
          code: 400,
          message: 'Company not found'
        }
      }

      const hiringAuthority = hiring_authority_email ? (await HiringAuthority.query()
        .where('work_email',hiring_authority_email)
        .first()) : null;

      const isAssignedToCompany = hiringAuthority ? HiringAuthorityRepository.isHiringAuthorityAssignedToCompany(hiringAuthority.id, company.id) : false;
      
      if(hiringAuthority && !isAssignedToCompany){
        return {
          success: false,
          code: 400,
          message:  'Hiring Authority not found in the company'
        }
      }
      trx = await Database.beginTransaction();
      const feeAgreement = await FeeAgreementRepository.createUnManaged({inputData:  { ...feeAgreementData, company_id: companyId}, userId, hiringAuthority, externalTransaction: trx});
      await trx.commit();
      await FeeAgreementRepository.loadRelations(feeAgreement);

      return feeAgreement;
    } catch (error) {
      appInsights.defaultClient.trackException({exception: error});
      if (trx) {
       await trx.rollback();
      }
      throw error;
    }

  }

  async getAssignationHistory(companyId) {  
    const company = await Company.find(companyId);
    if (!company) {
      return {
        success: false,
        code: 404,
        message: 'Company not found'
      };
    }
    
    try {
      const data = await Database.select([  
        'cpra.id',
        'pi_coach.full_name as creator',
        'pi_recruiter.full_name as recruiter',
        'cpra.created_at as date',
        'pi_recruiter.full_name as other_recruiter',
        Database.raw("'main' as type"),
        Database.raw("'assign' as status"),
      ])
      .from('company_recruiter_assignments as cpra')
      .join('users as coach', 'coach.id', 'cpra.coach_id')
      .join('users as recruiter', 'recruiter.id', 'cpra.recruiter_id')
      .join('personal_informations as pi_coach', 'pi_coach.id', 'coach.personal_information_id')
      .join('personal_informations as pi_recruiter', 'pi_recruiter.id', 'recruiter.personal_information_id')
      .where('company_id', companyId)
      .orderBy('cpra.created_at', 'desc');
      return {
        success: true,
        code: 200,
        data: data
      };
    } catch(error) {
      appInsights.defaultClient.trackException({ exception: error });
      return { success: false, code:500, message: 'There was a problem getting the assignment history' };
    }
  }

  async assignToRecruiter(companyId, recruiterId, coachId, externalTransaction) {
    let transaction, isAtomic;
    try {
      const company = await Company.find(companyId);
      if (!company) {
        return {
          success: false,
          code: 404,
          message: 'Company not found'
        };
      }
  
      const recruiter = await User
        .query()
        .with('personalInformation')
        .where('id', recruiterId)
        .first();
        
      if (!recruiter) {
        return {
          success: false,
          code: 404,
          message: 'Recruiter not found'
        };
      }
      const res = await RecruiterRepository.canAssign(recruiter.id, coachId);
      if (!res.success) {
        return res;
      }
      
      if (company.recruiter_id == recruiter.id) {
        return {
          success: false,
          code: 400,
          message: 'Recruiter already assigned'
        };
      }
      
      company.recruiter_id = recruiter.id;
      transaction = externalTransaction ? externalTransaction : await Database.beginTransaction();
      isAtomic = transaction && !externalTransaction;
      await CompanyRecruiterAssignment.create({company_id: company.id, recruiter_id: company.recruiter_id, coach_id: coachId}, transaction);
      await company.save(transaction);
  
      isAtomic && await transaction.commit();
      return {
        success: true,
        code: 200,
        data: recruiter
      };
    } catch(error) {
      if (isAtomic && transaction) await transaction.rollback();
      appInsights.defaultClient.trackException({ exception: error });
      return { success: false, code:500, message: 'There was a problem assigning the recruiter, please try again later' };
    }
  }
  
  async updateAndAssignHiringAuthority(hiringDataToUpdate, hiringAuthorityId, companyId){
    let dataToUpdate = {};
    try {
      const company = await Company.find(companyId);
      if (!company) {
        return {
          success: false,
          code: 404,
          message: Antl.formatMessage('messages.error.notFound', { entity: 'Company' })
        };
      }
      const hiringAuthority = await HiringAuthority.find(hiringAuthorityId);
      if (!hiringAuthority) {
        return {
          success: false,
          code: 404,
          message: Antl.formatMessage('messages.error.notFound', { entity: 'Hiring Authority' })
        };
      }
      const isHaAssigned = await HiringAuthorityRepository.isHiringAuthorityAssignedToCompany(hiringAuthorityId, companyId);
      if (isHaAssigned) {
        return {
          success: false,
          code: 400,
          message: Antl.formatMessage('messages.error.hiringAuthority.assigned')
        };
      }
      const transaction = await Database.beginTransaction();
      if (hiringAuthority.company_id){
        await HiringAuthorityHasCompany.create({ hiring_authority_id: hiringAuthority.id, company_id: hiringAuthority.company_id }, transaction);
      }
      dataToUpdate.company_id = companyId;
    
      if(hiringDataToUpdate.specialty_id){
        dataToUpdate = {
          ...dataToUpdate,
          specialty_id: hiringDataToUpdate.specialty_id,
          subspecialty_id: hiringDataToUpdate.subspecialty_id,
          position_id: hiringDataToUpdate.position_id
        }
      }

      hiringAuthority.merge(dataToUpdate);
      await hiringAuthority.save(transaction);

      await transaction.commit();
      
      await hiringAuthority.loadMany([
        'company',
        'specialty',
        'subspecialty',
        'position',
        'specialty.industry',
        'hiringAuthorityStatus'
      ]);
      Event.fire(EventType.HiringAuthority.Updated, {hiringAuthority});
      return {
        code: 200,
        success: true,
        data: hiringAuthority
      }
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      return {
        success: false,
        code: 500,
        message: Antl.formatMessage('messages.error.internalServer', { action: 'assigning', entity: 'hiring authority' })
      };
    }
  }

 /**
   * Show a list of possibles candidates for the company to add as employee
   *
   * @description This method searches in candidates & names, but removes any candidate/name in from the search
   *
   * @param {Number} companyId - The company that its employees will be hidden in the result
   * @param {Number} limit - How many rows should the search return, a low number is expected for faster results
   * @param {String} keyword - The keyword which the search will be based on, usually email or name
   *
   * @return {Object} Possibles employees listing
   *
   */
  async searchPossibleEmployees(companyId, limit = 6, keyword) {
    try {
      const candidatesAlreadyEmployees = Database.table('company_has_candidate_employees')
        .select('candidate_id')
        .where('company_id', companyId)
        .where('is_current_company', true);
      const queryCandidates = Database.table('candidates as item')
        .select([
          'item.email',
          'item.id',
          Database.raw('false as is_name'),
          'pi.full_name',
          Database.raw('count(*) over() as found'),
        ])
        .innerJoin('personal_informations as pi', 'item.personal_information_id', 'pi.id')
        .where(function () {
          this.where('pi.full_name', 'ilike', `%${keyword}%`).orWhere('item.email', 'ilike', `%${keyword}%`);
        })
        .whereNotIn('item.id', candidatesAlreadyEmployees)
        .limit(limit);

      const nameAlreadyCandidate = Database.table('candidates_from_names').select('name_id')
      const nameAlreadyEmployees = Database.table('company_has_name_employees')
        .select('name_id')
        .where('company_id', companyId)
        .where('is_current_company', true);
      const queryNames = Database.table('names as item')
        .select([
          'item.email',
          'item.id',
          Database.raw('true as is_name'),
          'pi.full_name',
          Database.raw('count(*) over() as found'),
        ])
        .innerJoin('personal_informations as pi', 'item.personal_information_id', 'pi.id')
        .where(function () {
          this.where('pi.full_name', 'ilike', `%${keyword}%`).orWhere('item.email', 'ilike', `%${keyword}%`);
        })
        .whereNotIn('item.id', nameAlreadyCandidate)
        .whereNotIn('item.id', nameAlreadyEmployees)
        .limit(limit);

      const query = Database.select(['item.id', 'item.email', 'item.is_name', 'item.full_name', 'item.found'])
        .from(Database.union(queryCandidates, true).union(queryNames, true).as('item'))
        .limit(limit)
        .orderBy(['is_name', 'full_name']);

      const result = await query;

      return {
        success: true,
        code: 200,
        data: result,
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
      return {
        success: false,
        code: 500,
        message: 'There was a problem while getting the possibles employees',
      };
    }
  }

  /**
   * Show a list of the company employees
   *
   * @description This method returns the availables employees in the company, with lazy loading
   *
   * @param {Number} companyId - The company which the employees will be obtained from
   * @param {Object} paginationData - The pagination data
   * @param {Number} paginationData.page - Which page is desired to load
   * @param {Number} paginationData.perPage - how many are desired to load
   *
   * @return {Object}  The company Employees listing
   */
  async getEmployees(companyId, { page = 1, perPage = 10 }) {
    try {
      const company = await Company.query().where('id', companyId).first();
      if (!company) {
        return {
          success: false,
          code: 404,
          message: 'Company not found',
        };
      }

      const candidateEmployeesSubquery = Database.table('candidates')
        .select([
          'candidates.id',
          'candidates.email',
          'candidates.title',
          'pi.full_name',
          Database.raw(
            "CASE WHEN (select concat(cty.title,', ',st.slug)) = ', ' THEN 'Not available' ELSE (select concat(cty.title,', ',st.slug)) END as location"
          ),
          'st.title as state',
          'cty.title as city',
          'spec.title as specialty',
          'sub.title as subspecialty',
          'employee.updated_at',
          Database.raw('false as is_name'),
          Database.raw("COALESCE(contacts.phone, '') as phone"),
          Database.raw("COALESCE(contacts.ext, '') as ext"),
          Database.raw("COALESCE(contacts.mobile, '') as mobile"),
        ])
        .innerJoin('company_has_candidate_employees as employee', 'candidates.id', 'employee.candidate_id')
        .innerJoin('personal_informations as pi', 'candidates.personal_information_id', 'pi.id')
        .leftJoin('addresses as add', 'pi.address_id', 'add.id')
        .leftJoin('contacts', 'pi.contact_id', 'contacts.id')
        .leftJoin('cities as cty', 'add.city_id', 'cty.id')
        .leftJoin('states as st', 'cty.state_id', 'st.id')
        .leftJoin('specialties as spec', 'candidates.specialty_id', 'spec.id')
        .leftJoin('subspecialties as sub', 'sub.id', 'candidates.subspecialty_id')
        .where('employee.company_id', companyId)
        .where('employee.is_current_company', true);

      const nameEmployeesSubquery = Database.table('names')
        .select([
          'names.id',
          'names.email',
          'names.title',
          'pi.full_name',
          Database.raw(
            "CASE WHEN (select concat(cty.title,', ',st.slug)) = ', ' THEN 'Not available' ELSE (select concat(cty.title,', ',st.slug)) END as location"
          ),
          'st.title as state',
          'cty.title as city',
          'spec.title as specialty',
          'sub.title as subspecialty',
          'employee.updated_at',
          Database.raw('true as is_name'),
          Database.raw("COALESCE(contacts.phone, '') as phone"),
          Database.raw("COALESCE(contacts.ext, '') as ext"),
          Database.raw("COALESCE(contacts.mobile, '') as mobile"),
        ])
        .innerJoin('company_has_name_employees as employee', 'names.id', 'employee.name_id')
        .innerJoin('personal_informations as pi', 'names.personal_information_id', 'pi.id')
        .leftJoin('addresses as add', 'pi.address_id', 'add.id')
        .leftJoin('contacts', 'pi.contact_id', 'contacts.id')
        .leftJoin('cities as cty', 'add.city_id', 'cty.id')
        .leftJoin('states as st', 'cty.state_id', 'st.id')
        .leftJoin('specialties as spec', 'names.specialty_id', 'spec.id')
        .leftJoin('subspecialties as sub', 'sub.id', 'names.subspecialty_id')
        .where('employee.company_id', companyId)
        .where('employee.is_current_company', true);

      const employees = await Database.select('*')
        .from(Database.union(candidateEmployeesSubquery).union(nameEmployeesSubquery).as('employees'))
        .orderBy('updated_at')
        .paginate(page, perPage);

      const result = employees;

      return {
        success: true,
        code: 200,
        data: result,
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
      return {
        success: false,
        code: 500,
        message: 'There was a problem while getting the employees',
      };
    }
  }

  async deleteHiringAuthority(hiringAuthorityId, companyId) {
    let trx;
    try {
      const hiringAuthority = await HiringAuthority.find(hiringAuthorityId);
      if (!hiringAuthority) {
        return {
          success: false,
          code: 404,
          message: Antl.formatMessage('messages.error.notFound', { entity: 'Hiring Authority' })
        };
      }

      trx = await Database.beginTransaction();

      if (hiringAuthority.company_id === companyId){
        const newPrimaryCompany = await HiringAuthorityHasCompany.query()
          .where('hiring_authority_id', hiringAuthorityId)
          .where('company_id', '!=', companyId)
          .orderBy('created_at', 'desc')
          .first();
        const company_id = newPrimaryCompany ? newPrimaryCompany.company_id : null;
        company_id && await trx
          .table('hiring_authority_has_companies')
          .where('company_id', company_id)
          .where('hiring_authority_id', hiringAuthorityId)
          .delete();
        hiringAuthority.merge({ company_id });
        await hiringAuthority.save(trx);
      }else{
        await trx
          .table('hiring_authority_has_companies')
          .where('company_id', companyId)
          .where('hiring_authority_id', hiringAuthorityId)
          .delete();
      }

      await trx.commit();

      Event.fire(EventType.HiringAuthority.Updated, { hiringAuthority });
      return {
        success: true,
        data: hiringAuthorityId,
        code: 200,
        message: Antl.formatMessage('messages.success.removed', { entity: 'hiring authority' })
      };
    } catch (error) {
      trx && (await trx.rollback());
      appInsights.defaultClient.trackException({ exception: error });
      return {
        success: false,
        code: 500,
        message: Antl.formatMessage('messages.error.internalServer', { action: 'removing', entity: 'hiring authority' })
      };
    }
  }



  async hiringAuthorities(companyId) {
    try {      
      const result = await Company.query()
        .where({ id: companyId })
        .with('hiringAuthorities')
        .with('otherHiringAuthorities')
        .fetch();
      
      const company = result.rows.length && result.rows[0].toJSON();
      const hiringAuthorities = company
        ? [
            ...(company.otherHiringAuthorities ? company.otherHiringAuthorities : []),
            ...(company.hiringAuthorities ? company.hiringAuthorities : []),
          ]
        : [];

      return {
        success: true,
        data: hiringAuthorities,
        code: 200,
      };
    } catch (err) {
      appInsights.defaultClient.trackException({ exception: err });
      return {
        success: false,
        code: 500,
        message: `There was a problem getting the hiring authorities, please try again later`,
      };     
    }
  }

  async getFeeAgreements(id) {
    const companyFeeAgreements = await CompanyFeeAgreement
      .query()
      .with('company')
      .with('company.specialty')
      .with('company.specialty.industry')
      .with('hiringAuthority')
      .with('feeAgreementStatus')
      .with('feeAgreementStatus.group')
      .with('currentDeclinator.personalInformation')
      .with('creator')
      .with('creator.personalInformation')
      .with('coach.personalInformation')
      .with('eventLogs')
      .with('eventLogs.event')
      .with('eventLogs.resultStatus')
      .whereRaw('fee_agreement_status_id not in (select id from fee_agreement_statuses where hidden)')
      .where('company_id', id)
      .orderBy('created_at', 'desc')
      .fetch();
    return companyFeeAgreements;
  }

  async getJobOrders(id) {
    const jobOrders = await (this.applyDefaultJobOrdersScope(JobOrder.query())
      .where('company_id', id)
      .fetch());
    return jobOrders;
  }

  applyDefaultJobOrdersScope(query) {
    query.setHidden([
      'company_id',
      'hiring_authority_id',
      'industry_id',
      'position_id',
      'address_id',
      'salary_offer',
      'start_date',
      'source',
      'open_since',
      'hot_item',
      'hot_item_date',
      'diferent_location',
      'status_id',
      'created_by',
      'updated_by'
    ])
    .with('specialty', (builder) => {
      builder.setHidden(['industry_id', ...auditFields]);
      builder.with('industry', (builder) => {
        builder.setHidden(auditFields);
      })
    })
    .with('subspecialty',builder=>{
      builder.select(['id','title'])
    })
    .with('position', builder => {
      builder.select(['id', 'title']);
    })
    .with('address', builder => {
      builder.setHidden(['city_id', ...auditFields]);
      builder.with('city', builder => {
        builder.setHidden(['state_id', ...auditFields]);
        builder.with('state', builder => {
          builder.setHidden(['country_id', ...auditFields]);
          builder.with('country', builder => {
            builder.setHidden([...auditFields]);
          });
        });
      });
    })
    .with('whiteSheet', builder => {
      builder.setHidden([
        'job_order_id',
        'relocation_assistance',
        'job_order_type_id',
        'fee_agreement_type',
        'fee_agreement_percent',
        'time_position_open',
        'position_filled',
        'benefits',
        'background_requirements',
        'preset_interview_dates',
        'created_at',
        'updated_at'
      ]);
    })
    .with('hiringAuthorities', builder => {
      builder
      .with('specialty')
      .with('subspecialty')
      .with('position')
      .setHidden([
        'company_id',
        'created_at',
        'updated_at',
        'created_by',
        'updated_by',
        'title',
        'personal_email',
        'personal_phone',
        'work_email',
        'work_phone'
      ]);
    })
    .orderBy('created_at', 'desc')
    return query;
  }

  async getDuplicates(filters) {
    try {
      const page = filters.page || 1;
      const perPage = filters.perPage || 10;
      const query = Database.table('companies as cp');
      switch (filters.column) {
        case 'Name':
          this.buildDuplicatesQuery(query, 'cp.name', false, filters);
          break;

        default:
          this.buildDuplicatesQuery(query, 'ct.phone', true, filters);
          break;
      }
      this.applyOrderClauseDuplicatesQuery(filters.direction, filters.orderBy, query);

      const flatRes = await query;
      const pagination = {
        total: flatRes.length,
        perPage,
        page,
        lastPage: page - 1,
        data: chunk(flatRes, perPage)[page - 1],
      };
      return {
        code: 200,
        success: true,
        data: pagination,
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      return {
        code: 500,
        success: false,
        message: 'There was a problem getting the companies, please try again later',
      };
    }
  }

  buildDuplicatesQuery(query, columnRelation, needsContacsRelation, filters) {
    query
      .select([
        `${columnRelation} as value`,
        Database.raw('array_agg(cp.id) as items'),
        Database.raw('array_length(array_agg(cp.id),1) as total'),
      ])
      .innerJoin('specialties as spec', 'cp.specialty_id', 'spec.id')
      .leftJoin('subspecialties as sub', 'sub.id', 'cp.subspecialty_id')
      .innerJoin('industries as itry', 'spec.industry_id', 'itry.id');
    needsContacsRelation && query.innerJoin('contacts as ct', 'cp.contact_id', 'ct.id');
    this.applyWhereClauseDuplicatesQuery(query, filters);
    query
      .whereRaw(`${columnRelation} is not null`)
      .groupBy(`${columnRelation}`)
      .havingRaw('array_length(array_agg(cp.id),1) > 1');
  }

  applyWhereClauseDuplicatesQuery(query, filters) {
    const { industryId, specialtyId, subspecialtyId } = filters;
    const whereClause = {};
    if (industryId) {
      whereClause['itry.id'] = industryId;
    }

    if (specialtyId) {
      whereClause['spec.id'] = specialtyId;
    }

    if (subspecialtyId) {
      whereClause['cp.subspecialty_id'] = subspecialtyId;
    }

    query.where(whereClause);
  }

  applyOrderClauseDuplicatesQuery(order, orderBy, query) {
    const orderingOptions = ['total', 'value'];
    const orderClause = orderingOptions.find((element) => element === orderBy) || orderingOptions[0];
    if (orderClause) {
      query.orderBy(orderClause, order || 'asc');
    }
  }

  async mergeDuplicated(masterId, selectedIds) {
    let trx;
    try {
      trx = await Database.beginTransaction();
      await this.mergeCompaniesData(masterId, selectedIds, trx);
      //Deletes
      await trx
        .table('hiring_authority_has_companies as hahc')
        .whereIn('hahc.company_id', selectedIds)
        .orWhere(
          Database.raw(
            '(hahc.company_id = :masterId and hahc.hiring_authority_id in (select id from hiring_authorities where company_id = :masterId) )',
            { masterId }
          )
        )
        .delete();
      await trx.table('company_recruiter_assignments').whereIn('company_id', selectedIds).delete();
      await trx.table('company_has_candidate_employees').whereIn('company_id', selectedIds).delete();
      await trx.table('company_has_name_employees').whereIn('company_id', selectedIds).delete();
      await trx.table('company_change_logs').whereIn('company_id', selectedIds).delete();
      await trx.table('company_type_reassures').whereIn('company_id', selectedIds).delete();
      await trx.table('companies').whereIn('id', selectedIds).delete();
      await trx.commit();
      return {
        code: 200,
        success: true,
        message: 'Companies merged Succesfully!',
      };
    } catch (error) {
      trx && (await trx.rollback());
      appInsights.defaultClient.trackException({ exception: error });

      return {
        code: 500,
        success: false,
        message: 'There was a problem merging the companies, please try again later',
      };
    }
  }

  async mergeCompaniesData(masterId, selectedIds, trx) {
    const tables = [
      'company_activity_logs',
      'company_notes',
      'company_has_files',
      'job_orders',
      'hiring_authorities',
      'names',
      'company_fee_agreements',
      'contacts_directory'
    ];
    for (const table of tables) {
      await trx.table(table).whereIn('company_id', selectedIds).update({ company_id: masterId });
    }
    //Company Employees
    await this.mergeCompanyEmployees('candidate', selectedIds, masterId, trx);
    await this.mergeCompanyEmployees('name', selectedIds, masterId, trx);
   
    //HA has Companies
    const companiesWithHAQuery = await Database.from('hiring_authority_has_companies')
      .whereIn('company_id', selectedIds)
      .distinct('company_id');
    if(companiesWithHAQuery.length > 0){
      const companiesWithHAIds = companiesWithHAQuery.map((item) => item.company_id);
      for (const companyId of companiesWithHAIds) {
        await trx
        .table('hiring_authority_has_companies as hahc')
        .where('hahc.company_id', companyId)
        .whereRaw(
          'not exists (select id from hiring_authorities where company_id = ? and id = hahc.hiring_authority_id)',
          [masterId]
        )
        .whereRaw(
          'not exists (select id from hiring_authority_has_companies where company_id = ? and hiring_authority_id = hahc.hiring_authority_id)',
          [masterId]
        )
        .update({ company_id: masterId });
      }
    }
  }

  async mergeCompanyEmployees(entity, selectedIds, masterId, trx) {
    const companiesWithEmployeesQuery = await Database.from(`company_has_${entity}_employees`)
      .whereIn('company_id', selectedIds)
      .distinct('company_id');
    if (companiesWithEmployeesQuery.length > 0) {
      const companiesWithEmployeesIds = companiesWithEmployeesQuery.map((item) => item.company_id);
      const updatedIds = await trx
        .table(`company_has_${entity}_employees as cpe`)
        .whereIn('cpe.company_id', companiesWithEmployeesIds)
        .where('cpe.is_current_company', true)
        .update({ is_current_company: false })
        .returning(`cpe.${entity}_id as id`);
      for (const companyId of companiesWithEmployeesIds) {
        await trx
          .table(`company_has_${entity}_employees as cpe`)
          .where('cpe.company_id', companyId)
          .whereRaw(
            `not exists (select id from company_has_${entity}_employees where company_id = ? and ${entity}_id = cpe.${entity}_id)`,
            [masterId]
          )
          .update({ company_id: masterId });
      }
      await trx
        .table(`company_has_${entity}_employees as cpe`)
        .where('cpe.company_id', masterId)
        .whereIn(`cpe.${entity}_id`, updatedIds)
        .update({ is_current_company: true });
    }
  }

  async getCompanyTypes() {
    const companyTypes = await CompanyType.query().fetch();
    return companyTypes; 
  }

  async changeOwnershipItems(oldUserId, newUserId, userLogId, extTransaction){
    let trx;
    const logsData = [];
    const date =  moment().format(DateFormats.SystemDefault);
    try {
      trx = extTransaction || (await Database.beginTransaction());

      const {  cpIds = [] } = await this.updateOwnerUrgentItems(oldUserId, newUserId, date, userLogId, trx);
      //Log Info
      for(const cpId of cpIds){
          logsData.push({       
            company_id: cpId,
            recruiter_id: newUserId,
            coach_id: userLogId,
            created_at: date,
            updated_at: date
          });
      }
      //Insert Logs
      await trx.insert(logsData).into('company_recruiter_assignments');

      if(!extTransaction){
        await trx.commit();
        return {
          success: true
        };
      }
      return { success: true, wereItemsMoved: logsData.length > 0 };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
      !extTransaction && trx && (await trx.rollback());
      return {
        success: false,
        error
      };
    }
  }

  async updateOwnerUrgentItems(oldUserId, newUserId, date, userLogId, trx){
    const cpIds = await trx
      .table('companies as cp')
      .where('cp.recruiter_id', oldUserId)
      .update({ recruiter_id: newUserId, updated_at: date, updated_by: userLogId })
      .returning('cp.id');

    return {
      cpIds
    }
  }

  async updateType(id, typeId){
    const company = await Company.find(id);
    if (!company) return;
    company.merge({ company_type_id: typeId });
    await company.save();
  }


  async getFiles(id){
    const companyFiles = await CompanyHasFile.query()
      .with('fileType', builder => {
          builder.setHidden(auditFields);
      })
      .where('company_id',id).fetch();
    return companyFiles; 
  }

  async canBeAssignedAutomatically(company) {
    const {data: usersEmailsWithAppropiableInventory} = await ModulePresetsConfigRepository.getById('usersEmailsWithAppropiableInventory');
    if (!Array.isArray(usersEmailsWithAppropiableInventory)) {
      throw new Error('usersEmailsWithAppropiableInventory preset config is not specified as expected, data must be en array');
    }
    const lowerCaseUserEmails = usersEmailsWithAppropiableInventory.map(email => email.formatToCompare());
    const userIdsQueryResult = await Database.from('users').select('id').whereIn(Database.raw('LOWER(email)'), lowerCaseUserEmails);
    const userIds = userIdsQueryResult.map(({id}) => `${id}`.formatToCompare());
    const canBeAssigned = userIds.includes(`${company.recruiter_id}`.formatToCompare()); 
    return canBeAssigned;
  }

  async assignIfCanBeAssignedAutomatically(company, recruiterId, coachId, externalTransaction) {
    if (!(await this.canBeAssignedAutomatically(company))) return;
    return await this.assignToRecruiter(company.id, recruiterId, coachId, externalTransaction);
  }

  async markAsSignedIfNotSigned(company, externalTransaction) {
    const transaction = externalTransaction ? externalTransaction : await Database.beginTransaction();
    const isAtomic = transaction && !externalTransaction;
    try {
      if (company.company_type_id == companyType.NotSigned ){
        company.signed = 1;
        company.company_type_id = companyType.Vendor;
      }
      await company.save(transaction);
    } catch(error) {
      isAtomic && (transaction.rollback());
      throw error;
    }
  }

  async handleOnFeeAgreementSigned(id, feeAgreementId, externalTransaction) {
    const company = await Company.find(id);
    if (!company) throw new Error(`Specified company wit id '${id}' not exists`);

    const feeAgreement = await CompanyFeeAgreement.find(feeAgreementId);
    if (!feeAgreement) throw new Error(`Specified fee agreement with id '${feeAgreementId}' not exists`);

    const transaction = externalTransaction ? externalTransaction : await Database.beginTransaction();
    const isAtomic = transaction && !externalTransaction;

    try {
      await this.markAsSignedIfNotSigned(company, transaction);
      await this.assignIfCanBeAssignedAutomatically(company, feeAgreement.creator_id, feeAgreement.coach_id, transaction);
      await this.markReassureAsDone(company, feeAgreement, externalTransaction);
      isAtomic && (await transaction.commit());
    } catch(error) {
      isAtomic && (await transaction.rollback());
      throw error;
    }
  }

  async markReassureAsDone(company, feeAgreement, externalTransaction) {
    const transaction = externalTransaction ? externalTransaction : await Database.beginTransaction();
    const isAtomic = transaction && !externalTransaction;
    try {
      await CompanyTypeReassure
        .query()
        .where('company_id', company.id)
        .whereNull('verification_date')
        .update({verification_date: new Date(), verified_by: feeAgreement.operations_validator_id})
        .transacting(transaction);
        isAtomic && (await transaction.commit());
    } catch(error) {
      isAtomic && (await transaction.rollback());
      throw error;
    }
  }
  /*
  * @deprecated
  */
  async updateSearchableText({ companyId = null, updateMissing = false}){
    const whereClauseQuery = updateMissing ? 'searchable_text IS NULL' : 'id = :companyId';
    const query = `
      UPDATE
        companies
      SET
        searchable_text = name,
        document_tokens = TO_TSVECTOR('simple', name)
      WHERE ${whereClauseQuery}
    `;
    await Database.raw(query, {
      companyId
    });
  }
}

module.exports = CompanyRepository;
