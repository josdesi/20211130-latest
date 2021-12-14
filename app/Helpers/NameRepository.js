'use strict';

//Utils
const appInsights = require('applicationinsights');
const Database = use('Database');
const { auditFields, nameStatus, nameTypes, joinStringForQueryUsage } = use('App/Helpers/Globals');
const { validate } = use('Validator');
const { uniq } = use('lodash');
const Event = use('Event');
const EventType = use('App/Helpers/Events');
const Antl = use('Antl');
const { batchInsert } = use('App/Helpers/QueryUtils');

//Models
const PersonalInformation = use('App/Models/PersonalInformation');
const Contact = use('App/Models/Contact');
const Address = use('App/Models/Address');
const Name = use('App/Models/Name');
const NameActivityLog = use('App/Models/NameActivityLog');
const NameNote = use('App/Models/NameNote');
const CandidateFromName = use('App/Models/CandidateFromName');
const NameStatus = use('App/Models/NameStatus');
const HiringAuthorityFromName = use('App/Models/HiringAuthorityFromName');
const CompanyHasNameEmployee = use('App/Models/CompanyHasNameEmployee');
const Company = use('App/Models/Company');

//Repositories
const LocationRepository = new (use('App/Helpers/LocationRepository'))();

class NameRepository {
  async create(req, user_id, companyId = null) {
    let trx;
    try {
      //Store contact
      const contactData = req.only(['phone', 'mobile', 'personal_email', 'ext']);
      trx = await Database.beginTransaction();
      const contact = await Contact.create(contactData, trx);
      //Store Address
      const { zip = null, city_id = null } = req.all();
      const zipCode = zip && city_id ? await LocationRepository.existZipOnCity(zip, city_id) : {};
      if ((zip && city_id) && !zipCode) {
        await trx.rollback();
        return {
          success: false,
          code: 400,
          message: "The zip code doesn't exist in the selected city",
        };
      }
      const { latitude, longitude } = zipCode;
      const address = await Address.create(
        { city_id, zip, coordinates: latitude && longitude ? `(${longitude},${latitude})` : null },
        trx
      );

      //Store Personal Information
      const personalInfoData = req.only(['first_name', 'last_name']);
      const personal_information = await PersonalInformation.create(
        {
          ...personalInfoData,
          contact_id: contact.id,
          address_id: address.id,
          created_by: user_id,
          updated_by: user_id,
        },
        trx
      );

      //Store Name
      const nameData = req.only([
        'position_id',
        'email',
        'title',
        'link_profile',
        'source_type_id',
        'current_company',
        'specialty_id',
        'subspecialty_id',
      ]);
      const _name_status_id = req.input('name_status_id');
      const name = await Name.create(
        {
          ...nameData,
          name_status_id: (_name_status_id || nameStatus.Name.Undefined),
          personal_information_id: personal_information.id,
          created_by: user_id,
          updated_by: user_id,
        },
        trx
      );

      //Store employerCompany
      if (companyId) {
        await this.createEmployerRelationship(name.id, companyId, true, user_id, trx);
        await name.loadMany({
          employerCompanies: (builder) => builder.transacting(trx).where('is_current_company', true),
        });
      }

      await trx.commit();
      Event.fire(EventType.Name.Created, { name });
      return {
        success: true,
        message: 'The name record was created successfully',
        code: 201,
        data: name.toJSON(),
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
      trx && await trx.rollback();
      return {
        success: false,
        code: 500,
        message: 'There was a problem creating the name, please try again later',
      };
    }
  }

  /**
   * Creates Name-Company Employer relationship
   *
   * @description This method allows the creation of the relationship, takes into account the logic of being active or not, substiting the current company if it is exists
   *
   * @param {Number} nameId - The name/contact, or employee
   * @param {Number} companyId - The company, or the employer
   * @param {Boolean} isCurrentCompany - Wether or not make the new relation the current one, if true any current company that the name had becomes false
   * @param {Number} userId - The user that is creating this name relationship
   * @param {Object} trx - Transaction to be used in the creation, helpful for any outside transaction
   *
   * @return {Object} the CompanyHasNameEmployee object created
   *
   */
  async createEmployerRelationship(nameId, companyId, isCurrentCompany, userId, trx) {
    const relationExists = await CompanyHasNameEmployee.query()
      .where('name_id', nameId)
      .where('company_id', companyId)
      .first();

    if (relationExists) {
      if(relationExists.is_current_company === false && isCurrentCompany){
        await CompanyHasNameEmployee.query()
          .transacting(trx)
          .where('name_id', nameId)
          .where('is_current_company', true)
          .update({ is_current_company: false, updated_by: userId });
        await CompanyHasNameEmployee.query()
          .transacting(trx)
          .where('id', relationExists.id)
          .update({ is_current_company: isCurrentCompany, updated_by: userId });
      }

      await Name.query().transacting(trx).where('id', nameId).update({ company_id: companyId });

      return relationExists;
    }

    if (isCurrentCompany) {
      await CompanyHasNameEmployee.query()
        .transacting(trx)
        .where('name_id', nameId)
        .where('is_current_company', true)
        .update({ is_current_company: false, updated_by: userId });
    }

    const employerCompanies = await CompanyHasNameEmployee.create(
      {
        name_id: nameId,
        company_id: companyId,
        is_current_company: isCurrentCompany,
        created_by: userId,
        updated_by: userId,
      },
      trx
    );

    await Name.query().transacting(trx).where('id', nameId).update({ company_id: companyId });

    return employerCompanies;
  }

  /**
   * Adds a company employer relation to a name
   *
   * @description This methods contains the logic to cheeck if the user can add such relation, then the @method createEmployerRelationship is called
   *
   * @param {Number} nameId - The name, or employee
   * @param {Number} companyId - The company, or the employer
   * @param {Number} userId - The user that is creating this name relationship
   *
   * @return {Object} A success with a code 200 and message or an message error with an error code
   *
   */
  async addNewCompanyEmployerRelation(nameId, companyId, userId) {
    let trx;

    try {
      const name = await Name.query().where('id', nameId).first();
      if (!name) {
        return {
          success: false,
          code: 404,
          message: 'Name not found',
        };
      }

      trx = await Database.beginTransaction();

      const newRelation = await this.createEmployerRelationship(nameId, companyId, true, userId, trx);
      if (newRelation.is_current_company) {
        name.company_id = newRelation.company_id;
        await name.save(trx);
      }
      await trx.commit();

      const result = await this.details(nameId, false);
      Event.fire(EventType.Name.Updated, {name: result});
      return {
        success: true,
        code: 201,
        data: result,
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      trx && (await trx.rollback());
      return {
        success: false,
        code: 500,
        message: 'There was a problem while adding the employer company to the name',
      };
    }
  }

  /**
   * Returns the nane data with
   * the corresponding relatiions
   *
   * @method details
   *
   * @param {Integer} id - name id
   * @param {Boolean} onlyBasicInfo - return only basic info
   * @param {Integer} userId - helps to know if a flag should be returned, can be null if not needed
   *
   * @return {Object} Candidate Details
   *
   */
  async details(id, onlyBasicInfo, userId = null) {
    const company = await Company.query()
      .select('companies.id', 'companies.name')
      .innerJoin('company_has_name_employees as employee', 'companies.id', 'employee.company_id')
      .where('employee.name_id', id)
      .where('employee.is_current_company', true)
      .first();

    const query = Name.query();
    query
      .select([
        '*',
        Database.raw("COALESCE(:companyName, names.current_company, '') as current_company, :companyId as company_id", {
          companyName: company ? company.name : null,
          companyId: company ? company.id : '',
        }),
      ]) //Modify the field current_company
      .where({ id })
      .setHidden([
        'source_type_id',
        'personal_information_id',
        'specialty_id',
        'subspecialty_id',
        'position_id'
      ])
      .with('employerCompanies', (builder) => builder.where('is_current_company', true))
      .with('personalInformation', (builder) => {
        builder.setHidden(['contact_id', 'address_id', ...auditFields]);
        builder.with('contact', (builder) => {
          builder.setHidden(auditFields);
        });
        builder.with('address', (builder) => {
          builder.setHidden(['city_id', ...auditFields]);
          builder.with('city', (builder) => {
            builder.setHidden(['state_id', ...auditFields]);
            builder.with('state', (builder) => {
              builder.setHidden(['country_id', ...auditFields]);
              builder.with('country', (builder) => {
                builder.setHidden(auditFields);
              });
            });
          });
        });
      })
      .with('specialty', (builder) => {
        builder.setHidden(['industry_id', ...auditFields]);
        builder.with('industry', (builder) => {
          builder.setHidden(auditFields);
        })
      })
      .with('subspecialty', (builder) => {
        builder.setHidden(auditFields);
      })
      .with('position', (builder) => {
        builder.setHidden(['industry_id', ...auditFields]);
      })
      .with('sourceType', (builder) => {
        builder.setHidden([...auditFields]);
      })
      .with('nameType', (builder) => {
        builder.setHidden([...auditFields]);
      })
      .with('nameStatus', (builder) => {
        builder.setHidden([...auditFields]);
      });
    if (!onlyBasicInfo) {
      this.withAllListings(query);
    }
    const name = await query.first();

    if(!name) return null;

    const shouldAskRecruiterAddEmployer = await this.shouldRecruiterAddEmployer(id, userId);

    const result = {
      ...name.toJSON(),
      shouldAskRecruiterAddEmployer,
    }

    return result;
  }


   /**
   * Returns wether or not the recruiter should add an employer to the name
   *
   * @description When a name does not have an employer, the front should show a modal asking the user to add a company, this method expectes to return such flag
   *
   * @param {Number} nameId - The name the recruiter is visiting
   * @param {Number} userId - The user visting the name's profile
   *
   * @return {Boolean} If the user should add an employer or not
   */
  async shouldRecruiterAddEmployer(nameId, userId) {
    const rawName = await Name.query()
      .where('id', nameId)
      .with('employerCompanies', (builder) => builder.where('is_current_company', true))
      .first();
    if (!rawName) return false;

    const name = rawName.toJSON();

    // const nameBelongsRecruiter = name.created_by === userId; //Migrations have different user

    return Boolean(name.employerCompanies.length <= 0)
  }

  async update(nameId, req, user_id, companyId = null) {
    const name = await Name.findOrFail(nameId);
    const personalInformation = await name.personalInformation().fetch();
    const contact = await personalInformation.contact().fetch();
    const rules = {
      personal_email: `max:254|string|unique:contacts,personal_email,id,${contact.id}`,
    };
    const messages = {
      'personal_email.unique': 'A Name with the provided other email already exists'
    }
    const personal_email = req.only('personal_email');
    const validation = await validate(personal_email, rules, messages);
    if (validation.fails()) {
      return {
        code: 400,
        ...validation.messages()[0],
      };
    }
    const address = await personalInformation.address().fetch();

    // transaction
    const trx = await Database.beginTransaction();
    try {
      //Update contact
      const contactData = req.only(['phone', 'mobile', 'personal_email', 'ext']);
      await contact.merge(contactData);
      await contact.save(trx);

      //Update Address
      const { zip, city_id } = req.all();
      const zipCode = zip && city_id ? await LocationRepository.existZipOnCity(zip, city_id) : {};
      if ((zip && city_id) && !zipCode) {
        return {
          success: false,
          code: 400,
          message: "The zip code doesn't exist in the selected city",
        };
      }
      const { latitude, longitude } = zipCode;
      await address.merge({ city_id, zip, coordinates: latitude && longitude ? `(${longitude},${latitude})` : null });
      await address.save(trx);

      //Update Employer Company
      if (companyId) {
        await this.createEmployerRelationship(nameId, companyId, true, user_id, trx);
        await name.loadMany({
          employerCompanies: (builder) => builder.transacting(trx).where('is_current_company', true),
        });
      }

      //Update Personal Information
      const personalInfoData = req.only(['first_name', 'last_name']);
      await personalInformation.merge({ ...personalInfoData, updated_by: user_id });
      await personalInformation.save(trx);
      //Update Name
      const nameData = req.only([
        'current_company',
        'position_id',
        'email',
        'title',
        'link_profile',
        'source_type_id',
        'specialty_id',
        'subspecialty_id',
        'name_status_id'
      ]);
      await name.merge({
        ...nameData,
        updated_by: user_id,
      });
      await name.save(trx);

      await trx.commit();
      
      const updatedName = await this.details(nameId, false);
      Event.fire(EventType.Name.Updated, {name: updatedName});
      return {
        success: true,
        code: 201,
        data: updatedName,
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      trx && (await trx.rollback());
      return {
        success: false,
        code: 500,
        message: 'There was a problem updating the name profile, please try again later',
      };
    }
  }

  async withAllListings(query) {
    query
      .with('files', (builder) => {
        builder.setHidden(['file_type_id', 'name_id']);
        builder.with('fileType', (builder) => {
          builder.setHidden(auditFields);
        });
      })
      .with('notes', (builder) => {
        builder.setHidden(['name_id', 'user_id']);
        builder.orderBy('created_at', 'desc')
      })
      .with('activityLogs', (builder) => {
        builder.setHidden(['name_id', 'user_id']);
        builder.orderBy('created_at', 'desc');
        builder.with('activityLogType', (builder) => {
          builder.setHidden(auditFields);
        });
        builder.with('bulkReference', (builder) => {
          builder.setHidden(auditFields);
        });
        builder.with('user', (builder) => {
          builder.setHidden([
            'avatar',
            'double_authentication',
            'step_wizard',
            'personal_information_id',
            'user_status_id',
            ...auditFields,
          ]);
        });
      })
  }

  /**
   * Creates a batch of activities using the activityData
   *
   * @summart This method is expected to be called from other part of the system that creates many activities, while not necessary, usually sharing the same values
   *
   * @method createActivityLog
   *
   * @param {Object[]} activityData - An array of objects containing each one the activity info
   * @param {String} activityData[].body - The activity body
   * @param {Number} activityData[].activity_log_type_id - The activity log type id
   * @param {Number} activityData[].name_id - The activity name/contact
   * @param {Boolean} activityData[].created_by_system - If the activity was created from system
   * @param {Number} activityData[].user_id - The user creating the activity, if not passed, the userId param will be added automatically
   * @param {JSON} activityData[].metadata - The activity metada
   * @param {Integer} userId - The user creating the activities, this will be added automatically to each activityData object if not found
   * @param {Object} optionalParams - An object that contains optional/extra params, trying not to put too many unnecessaries params
   *
   * @return {Object} A success with a code 201 and the activity or an error code
   */
  async createBatchActivity(activityData, userId, optionalParams = {}) {
    const { externalTrx = null } = optionalParams;
    let trx;

    try {
      trx = externalTrx ? externalTrx : await Database.beginTransaction();

      const activityDataWithRecruiter = activityData.map((activity) => {
        if (!activity.user_id) activity.user_id = userId;
        return activity;
      });
      const activitiesCreated = await batchInsert(NameActivityLog, activityDataWithRecruiter, trx);

      const nameIds = activityData.map(({ name_id }) => name_id);

      if (!externalTrx) await trx.commit();

      Event.fire(EventType.Name.BatchActivityCreated, { nameIds });

      const result = activitiesCreated;

      return {
        success: true,
        code: 201,
        data: result,
      };
    } catch (error) {
      if (!externalTrx && trx) await trx.rollback();

      appInsights.defaultClient.trackException({ exception: error });

      return {
        success: false,
        code: 500,
        message: Antl.formatMessage('messages.error.internalServer', {
          action: 'creating',
          entity: 'batch name activities',
        }),
      };
    }
  }

  async refreshLastActivityDateTableByBatchIds(nameIds) {
    try {
      await Database.raw(
        `INSERT INTO
        name_last_activity_logs (
          name_id,
          user_id,
          name_activity_log_id,
          activity_log_type_id,
          body,
          created_at,
          updated_at,
          created_by_system,
          metadata,
          title,
          user_name
        )
      SELECT
        DISTINCT on (name_id) act.name_id,
        act.user_id,
        act.id as name_activity_log_id,
        act.activity_log_type_id,
        act.body,
        act.created_at,
        act.updated_at,
        act.created_by_system,
        act.metadata,
        act_types.title,
        v_users.user_name
      from
        name_activity_logs as act
        inner join activity_log_types as act_types on act.activity_log_type_id = act_types.id
        inner join v_users on act.user_id = v_users.id
      where
        act.name_id in ${joinStringForQueryUsage(nameIds)}
      order by
        name_id desc,
        created_at desc 
      ON CONFLICT (name_id) DO
      UPDATE
      SET
        name_id = excluded.name_id,
        user_id = excluded.user_id,
        name_activity_log_id = excluded.name_activity_log_id,
        activity_log_type_id = excluded.activity_log_type_id,
        body = excluded.body,
        created_at = excluded.created_at,
        updated_at = excluded.updated_at,
        created_by_system = excluded.created_by_system,
        metadata = excluded.metadata,
        title = excluded.title,
        user_name = excluded.user_name
      WHERE
        name_last_activity_logs.name_id = excluded.name_id;`
      );
      return { success: true };
    } catch (error) {
      return { success: false, error };
    }
  }

  async refreshLastActivityDateTableById(nameId) {
    try {
      await Database.raw(
        `INSERT INTO
        name_last_activity_logs (
          name_id,
          user_id,
          name_activity_log_id,
          activity_log_type_id,
          body,
          created_at,
          updated_at,
          created_by_system,
          metadata,
          title,
          user_name
        )
      SELECT
        DISTINCT on (name_id) act.name_id,
        act.user_id,
        act.id as name_activity_log_id,
        act.activity_log_type_id,
        act.body,
        act.created_at,
        act.updated_at,
        act.created_by_system,
        act.metadata,
        act_types.title,
        pi.full_name as user_name
      from
        name_activity_logs as act
        inner join activity_log_types as act_types on act.activity_log_type_id = act_types.id
        inner join users on act.user_id = users.id
        inner join personal_informations as pi on users.personal_information_id = pi.id
      where
        act.name_id = :nameId
      order by
        name_id desc,
        created_at desc 
      ON CONFLICT (name_id) DO
      UPDATE
      SET
        name_id = excluded.name_id,
        user_id = excluded.user_id,
        name_activity_log_id = excluded.name_activity_log_id,
        activity_log_type_id = excluded.activity_log_type_id,
        body = excluded.body,
        created_at = excluded.created_at,
        updated_at = excluded.updated_at,
        created_by_system = excluded.created_by_system,
        metadata = excluded.metadata,
        title = excluded.title,
        user_name = excluded.user_name
      WHERE
        name_last_activity_logs.name_id = :nameId;`,
        { nameId }
      );
      return { success: true };
    } catch (error) {
      return { success: false, error };
    }
  }

  /**
   * Returns a custom response that determines
   * the creation of an activity
   *
   * @method createActivityLog
   *
   * @param {String} body
   * @param {Integer} activity_log_type_id
   * @param {Integer} name_id
   * @param {Integer} user_id
   * @param {Object} optionalParams - An object that contains optional/extra params, trying not to put too many unnecessaries params
   *
   * @return {Object} A success with a code 201 and the activity or an error code
   */
  async createActivityLog(body, activity_log_type_id, name_id, user_id, optionalParams = {}) {
    const name = await Name.find(name_id);
    if (!name) {
      return {
        success: false,
        code: 404,
        message: 'Name record not found',
      };
    }

    const {
      metadata = {},
      createdBySystem = false,
      externalTrx = null,
      dateUpdated = null
    } = optionalParams

    let trx;

    try {
      trx = externalTrx ? externalTrx : await Database.beginTransaction();

      const nameActivityLog = await NameActivityLog.create({
        name_id,
        body,
        user_id,
        activity_log_type_id,
        created_by_system: createdBySystem,
        metadata,
      }, trx);
      
      // FOR UPDATING DATE IF IT'S AN ACT LOG FROM RC API
      if(dateUpdated){
        nameActivityLog.merge({ created_at: dateUpdated });
        await nameActivityLog.save(trx);
      }

      if(!externalTrx) {
        await trx.commit();
      }

      await nameActivityLog.loadMany({
        'activityLogType': (builder) => builder.setHidden(auditFields),
        'bulkReference': (builder) => builder.setHidden(auditFields),
        'user': (builder) =>
          builder.setHidden([
            'personal_information_id',
            'user_id',
            'double_authentication',
            'step_wizard',
            'user_status_id',
            'email_signature',
            ...auditFields])
      });

      Event.fire(EventType.Name.ActivityCreated, { nameId: name_id });

      const result = nameActivityLog.toJSON();
      delete result.metadata;

      return {
        success: true,
        code: 201,
        data: result,
      };
    } catch (error) {
      if(!externalTrx && trx) {
        await trx.rollback()
      }
      appInsights.defaultClient.trackException({ exception: error });

      return {
        success: false,
        code: 500,
        message: 'There was a problem creating the Name activity, please try again later',
      };
    }
  }

  async updateActivityLog(req, activityLogId, user_id) {
    const { body, activity_log_type_id } = req;
    const nameActivityLog = await NameActivityLog.find(activityLogId)
    if (!nameActivityLog) {
      return {
        success: false,
        code: 404,
        message: 'ActivityLog not found',
      };
    }
    if (nameActivityLog.user_id != user_id) {
      return {
        success: false,
        code: 403,
        isInactive: false,
        redirect: false,
        message: "You don't have the permission required to use the resource",
      };
    }
    if (nameActivityLog.created_by_system) {
      return {
        success: false,
        code: 409,
        message: Antl.formatMessage('messages.error.activityFromSystem'),
      };
    }
    try {
      await nameActivityLog.merge({ body, activity_log_type_id });
      await nameActivityLog.save();
      await nameActivityLog.loadMany({
        'activityLogType': (builder) => builder.setHidden(auditFields),
        'user': (builder) =>
          builder.setHidden([
            'personal_information_id',
            'user_id',
            'double_authentication',
            'step_wizard',
            'user_status_id',
            ...auditFields])
      });

      Event.fire(EventType.Name.ActivityUpdated, { nameId: nameActivityLog.name_id });

      return {
        success: true,
        code: 201,
        data: nameActivityLog,
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      return {
        success: false,
        code: 500,
        message: 'There was a problem updating the Name activity, please try again later',
      };
    }
  }

  async deleteActivityLog(activityLogId, user_id) {
    const nameActivityLog = await NameActivityLog.find(activityLogId)
    if (!nameActivityLog) {
      return {
        success: false,
        code: 404,
        message: 'ActivityLog not found',
      };
    }
    if (nameActivityLog.user_id != user_id) {
      return {
        success: false,
        code: 403,
        isInactive: false,
        redirect: false,
        message: "You don't have the permission required to use the resource",
      };
    }
    if (nameActivityLog.created_by_system) {
      return {
        success: false,
        code: 409,
        message: Antl.formatMessage('messages.error.activityFromSystem'),
      };
    }
    try {
      await nameActivityLog.delete();

      Event.fire(EventType.Name.ActivityDeleted, { nameId: nameActivityLog.name_id });

      return {
        success: true,
        code: 200,
        message: 'The activiy log was deleted successfully!',
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      return {
        success: false,
        code: 500,
        message: 'There was a problem deleting the Name activity, please try again later',
      };
    }
  }

  /**
   * Returns the companies trigram name search
   *
   * @description Since many searches will be used using the same query, a modularization was required, instead obtaining the core that the trigram search will be using always
   *
   * @param {Number} keyword - The company name is being searched
   *
   * @return {Object} The query object
   */
  getTrigramSearchQuery(keyword) {
    return Database.table('companies')
      .select(['*', Database.raw('similarity(name, :keyword)', { keyword })])
      .whereRaw(Database.raw('name % :keyword', { keyword }))
      .orderBy('similarity', 'desc')
      .orderBy('name', 'asc')
      .as('companies');
  }

  /**
   * Get the companies that a name can belong to
   *
   * @description Returns a list of the possibles companies the name can be an employee, based on the old current_company field & the company_id
   *
   * @param {Number} nameId - The name from which the companies will be obtained from
   * @param {Number} limit - How many suggestiones will be returned
   *
   * @return {Object[]} The list of suggested companies
   */
   async getSuggestedCompanies(nameId, limit = 6) {
    try {
      const suggestedCompaniesIds = [];
      const lowSimilarity = '0.20';
      const mediumSimilarity = '0.25';

      const name = await Database.table('contacts_directory')
        .where({
          origin_table_id: nameId,
          role_id: nameTypes.Name,
        })
        .first();
      if (!name) {
        return {
          success: false,
          code: 404,
          message: 'Name not found',
        };
      }

      const oldCurrentCompany = name.current_company;
      const cityId = name.city_id;
      const stateId = name.state_id;

      const shouldSearchForMoreCompanies = () => suggestedCompaniesIds.length < limit && oldCurrentCompany;

      const searchCompaniesInCity = async () => {
        await Database.raw(`SET pg_trgm.similarity_threshold = ${lowSimilarity}`);
        const trigramSearchQuery = this.getTrigramSearchQuery(oldCurrentCompany);

        return await Database.select('companies.*')
          .from(trigramSearchQuery)
          .where('companies.city_id', cityId)
          .orderBy('similarity', 'desc')
          .orderBy('name', 'asc')
          .limit(limit);
      };

      const searchCompaniesInState = async () => {
        await Database.raw(`SET pg_trgm.similarity_threshold = ${mediumSimilarity}`);
        const trigramSearchQuery = this.getTrigramSearchQuery(oldCurrentCompany);

        return await Database.select('companies.*')
          .from(trigramSearchQuery)
          .innerJoin('cities', 'cities.id', 'companies.city_id')
          .where('cities.state_id', stateId)
          .orderBy('similarity', 'desc')
          .orderBy('name', 'asc')
          .limit(limit - suggestedCompaniesIds.length);
      };

      const searchCompanies = async () => {
        await Database.raw(`SET pg_trgm.similarity_threshold = ${mediumSimilarity}`);
        const trigramSearchQuery = this.getTrigramSearchQuery(oldCurrentCompany);

        return await Database.select('companies.*')
          .from(trigramSearchQuery)
          .orderBy('similarity', 'desc')
          .orderBy('name', 'asc')
          .limit(limit - suggestedCompaniesIds.length);
      };

      if (shouldSearchForMoreCompanies() && cityId) {
        const result = await searchCompaniesInCity();
        suggestedCompaniesIds.push(...result.map((row) => row.id));
      }

      if (shouldSearchForMoreCompanies() && stateId) {
        const result = await searchCompaniesInState();
        suggestedCompaniesIds.push(...result.map((row) => row.id));
      }

      if (shouldSearchForMoreCompanies()) {
        const result = await searchCompanies();
        suggestedCompaniesIds.push(...result.map((row) => row.id));
      }

      const uniqSuggestedCompanyIds = uniq(suggestedCompaniesIds);

      const result = await this.getCompaniesWithInformation(uniqSuggestedCompanyIds);

      return {
        success: true,
        code: 200,
        data: this.orderArray(result, uniqSuggestedCompanyIds),
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      return {
        success: false,
        code: 500,
        message: 'There was a problem while obtaining the suggested companies',
      };
    }
  }

  /**
   * Orders the array passed by the field & values of the orderOfArray, using the order orderOfArray already has. Be careful because the two passed arrays must match or either data will be loss or duplicated
   *
   * @description This helper methods allows to modify the order one array has, a field (array key) must be passed, as well another array that contains the values of those fiels/keys in the first array, but this second array must be ordered as wished
   *
   * @param {Object[]} array - Array being ordered
   * @param {Object[]} orderOfArray - How the array is expected to be ordered, just contains the field values
   * @param {String} field - The field that will be compared against while ordering, usually a important key like 'id'
   *
   * @return {Object[]} The array ordered
   */
  orderArray(array, orderOfArray, field = 'id') {
    const orderedArray = [];

    for (const valueToFind of orderOfArray) {
      const itemToPush = array.find((item) => item[field] === valueToFind);

      if (itemToPush) orderedArray.push(itemToPush);
    }

    return orderedArray;
  }

  async getCompaniesWithInformation(companyIds) {
    return (
      await Company.query()
        .whereIn('id', companyIds)
        .setHidden([
          'industry_id',
          'specialty_id',
          'subspecialty_id',
          'contact_id',
          'recruiter_id',
          'updated_at',
          'updated_by',
        ])
        .with('type', (builder) => builder.select(['id', 'title', 'color']))
        .with('specialty', (builder) => {
          builder.setHidden(['industry_id', ...auditFields]);
          builder.with('industry', (builder) => {
            builder.setHidden(auditFields);
          });
        })
        .with('subspecialty', (builder) => {
          builder.setHidden(auditFields);
        })
        .with('contact', (builder) => {
          builder.select(['id', 'phone', 'ext']);
        })
        .with('city', (builder) => {
          builder.setHidden(['state_id', 'created_at', 'updated_at']).with('state', (builder) => {
            builder.setHidden(['country_id', ...auditFields]);
            builder.with('country', (builder) => {
              builder.setHidden(auditFields);
            });
          });
        })
        .with('recruiter', (builder) => {
          builder
            .setHidden([
              'personal_information_id',
              'created_at',
              'updated_at',
              'avatar',
              'double_authentication',
              'step_wizard',
              'role_id',
              'user_status_id',
            ])
            .with('personalInformation', (builder) => {
              builder.setHidden(['contact_id', 'personal_information_id', ...auditFields]);
              builder.with('contact', (builder) => {
                builder.setHidden(['created_at', 'updated_at', 'created_by', 'updated_by']);
              });
            });
        })
        .with('createdBy', (builder) => {
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
              'user_status_id',
              ...auditFields,
            ])
            .with('personalInformation', (builder) => {
              builder.setHidden(['contact_id', 'personal_information_id', 'address-id', ...auditFields]);
            });
        })
        .fetch()
    ).toJSON();
  }

  async createNote(req, name_id, user_id) {
    const { body, title } = req;
    const name = await Name.find(name_id);
    if (!name) {
      return {
        success: false,
        code: 404,
        message: 'Name record not found',
      };
    }
    try {
      const nameNote = await NameNote.create({
        name_id,
        body,
        title,
        user_id
      });
      await nameNote.load('user', builder => {
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
        data: nameNote,
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      return {
        success: false,
        code: 500,
        message: 'There was a problem creating the Name note, please try again later',
      };
    }
  }

  async updateNote(req, noteId, user_id) {
    const { body, title } = req;
    const nameNote = await NameNote.find(noteId);
    if (!nameNote) {
      return {
        success: false,
        code: 404,
        message: 'Note not found',
      };
    }
    if (nameNote.user_id != user_id) {
      return {
        success: false,
        code: 403,
        isInactive: false,
        redirect: false,
        message: "You don't have the permission required to use the resource",
      };
    }
    try {
      await nameNote.merge({ body, title });
      await nameNote.save();
      await nameNote.load('user', builder => {
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
        data: nameNote,
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      return {
        success: false,
        code: 500,
        message: 'There was a problem updating the Name note, please try again later',
      };
    }
  }

  async deleteNote(noteId, user_id) {
    const nameNote = await NameNote.find(noteId);
    if (!nameNote) {
      return {
        success: false,
        code: 404,
        message: 'Note not found',
      };
    }
    if (nameNote.user_id != user_id) {
      return {
        success: false,
        code: 403,
        isInactive: false,
        redirect: false,
        message: "You don't have the permission required to use the resource",
      };
    }
    try {
      await nameNote.delete();

      return {
        success: true,
        code: 200,
        message: 'Note deleted succesfully!',
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      return {
        success: false,
        code: 500,
        message: 'There was a problem deleting the Name note, please try again later',
      };
    }
  }

  async existsCandidateFromName(name_id) {
    const count = await CandidateFromName
      .query()
      .where('name_id', name_id)
      .count('* as total');
    return count[0].total > 0;
  }

  /**
   * Return an array of names
   *
   * @param {Number[]} nameIds
   */
  async getNameByIds(nameIds) {
    const names = (await Name.query()
      .select([
        'names.id',
        'names.email',
        'pi.full_name',
        Database.raw("(select concat(cty.title,', ',st.slug)) as location"),
        'st.title as state',
        'cty.title as city',
        'spec.title as specialty',
        'sub.title as subspecialty',
      ])
      .with('employerCompanies', (builder) => builder.where('is_current_company', true))
      .leftJoin('personal_informations as pi', 'names.personal_information_id', 'pi.id')
      .leftJoin('addresses as add', 'pi.address_id', 'add.id')
      .leftJoin('cities as cty', 'add.city_id', 'cty.id')
      .leftJoin('states as st', 'cty.state_id', 'st.id')
      .leftJoin('specialties as spec', 'names.specialty_id', 'spec.id')
      .leftJoin('subspecialties as sub', 'sub.id', 'names.subspecialty_id')
      .whereIn('names.id', nameIds)
      .fetch()).toJSON();

    return names;
  }

  async existsHiringAuthorityFromName(name_id) {
    const count = await HiringAuthorityFromName
      .query()
      .where('name_id', name_id)
      .count('* as total');
    return count[0].total > 0;
  }

  async canCreateCandidateFromName(name) {
    return !(await this.existsCandidateFromName(name.id))
      &&
      !(await this.existsHiringAuthorityFromName(name.id));
  }

  async cancCreateHiringAuthorityFromName(name) {
    return !(await this.existsCandidateFromName(name.id))
      &&
      !(await this.existsHiringAuthorityFromName(name.id));
  }



  async getCopyOfAName(nameId, trx) {
    const nameToCopy = await Name.find(nameId);
    const copiedNameData = nameToCopy.toJSON();
    delete copiedNameData.id;
    copiedNameData.original_name_id = nameId;
    if (trx) {
      return await Name.create(copiedNameData, trx);
    }
    return await Name.create(copiedNameData);
  }

  async getMappedNameStatus(name_type_id, original_table_id) {
    const nameStatus = await NameStatus
      .query()
      .where('name_type_id', name_type_id)
      .where('original_table_id', original_table_id)
      .first();
    return nameStatus;
  }


}

module.exports = NameRepository;
