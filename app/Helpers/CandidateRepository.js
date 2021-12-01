'use strict';

//Repositories
const RecruiterRepository = new (use('App/Helpers/RecruiterRepository'))();
const NameRepository = new (use('App/Helpers/NameRepository'))();
const BlueSheetRepository = new (use('App/Helpers/BlueSheetRepository'))();
const UserRepository = new (use('App/Helpers/UserRepository'))();
const LocationRepository = new (use('App/Helpers/LocationRepository'))();
const PlacementRepository = new (use('App/Helpers/PlacementRepository'))();

//Utils
const Database = use('Database');
const Helpers = use('Helpers');
const appInsights = require('applicationinsights');
const { fileType } = use('App/Helpers/FileType');
const { moveFile, copyFile, deleteServerFile, readFilePropertiesFromPath, extractRelativePathFromBlobUrl } = use('App/Helpers/FileHelper');
const {
  userFields,
  auditFields,
  EntityTypes,
  CandidateTypeSchemes,
  CandidateStatusSchemes,
  DateFormats,
  OperationType,
  userRoles,
  AdditionalRecruiterStatus,
  AdditionalRecruiterTypes,
  userPermissions,
  nameTypes,
  joinStringForQueryUsage,
} = use('App/Helpers/Globals');
const { validate } = use('Validator');
const { remove, findIndex, countBy, filter, intersectionBy, find, uniq } = use('lodash');
const moment = use('moment');
const humanInterval = use('human-interval');
const Event = use('Event');
const EventTypes = use('App/Helpers/Events');
const Antl = use('Antl');
const { batchInsert } = use('App/Helpers/QueryUtils');

//Models
const PersonalInformation = use('App/Models/PersonalInformation');
const Contact = use('App/Models/Contact');
const Address = use('App/Models/Address');
const Candidate = use('App/Models/Candidate');
const CandidateHasFile = use('App/Models/CandidateHasFile');
const CandidateNote = use('App/Models/CandidateNote');
const CandidateActivityLog = use('App/Models/CandidateActivityLog');
const City = use('App/Models/City');
const JobOrderHasCandidate = use('App/Models/JobOrderHasCandidate');
const JobOrder = use('App/Models/JobOrder');
const CandidateFromName = use('App/Models/CandidateFromName');
const CandidateRecruiterAssignment = use('App/Models/CandidateRecruiterAssignment');
const Name = use('App/Models/Name');
const User = use('App/Models/User');
const OperatingMetricConfiguration = use('App/Models/OperatingMetricConfiguration');
const CandidateOperatingMetric = use('App/Models/CandidateOperatingMetric');
const CandidateTypeLog = use('App/Models/CandidateTypeLog');
const CandidateChangeLog = use('App/Models/CandidateChangeLog');
const CandidateAdditionalRecruiter = use('App/Models/CandidateAdditionalRecruiter');
const CompanyHasCandidateEmployee = use('App/Models/CompanyHasCandidateEmployee');
const Company = use('App/Models/Company');
const userBuilder = (builder) => {
  builder.setHidden(['personal_information_id', 'user_id', ...auditFields]);
  builder.with('personalInformation', (builder) => {
    builder.setHidden(['contact_id', 'address_id', 'birthdate', ...auditFields]);
    builder.with('contact', (builder) => {
      builder.setHidden([...auditFields]);
    });
  });
};

class CandidateRepository {
  /**
   * Returns a custom response that determines
   * the creation of the candidate
   *
   * @method create
   *
   * @param {Object} contactData
   * @param {Object} addressData
   * @param {Object} personalInfoData
   * @param {Object} candidateData
   * @param {Integer} user_id
   * @param {Number?} companyId - Used to create the employer company relationship
   *
   * @return {Object} A success with a code 200 and message or a message error with an error code
   *
   */
  async create(contactData, addressData, personalInfoData, candidateData, user_id, companyId = null) {
    const trx = await Database.beginTransaction();
    try {
      //Store contact
      const { phone, mobile, personal_email, ext } = contactData;
      const contact = await Contact.create({ phone, mobile, personal_email, ext }, trx);

      //Store Address
      const { zip, city_id } = addressData;
      const zipCode = await LocationRepository.existZipOnCity(zip, city_id);
      if (!zipCode) {
        trx && (await trx.rollback());
        return {
          success: false,
          code: 400,
          message: "The zip code doesn't exist in the selected city",
        };
      }
      const { latitude, longitude } = zipCode;
      const city = await City.find(city_id);
      const address = await Address.create(
        { city_id, zip, coordinates: `(${longitude},${latitude})`, address: city.title },
        trx
      );

      //Store Personal Information
      const { first_name, last_name } = personalInfoData;
      const full_name = `${first_name} ${last_name}`;
      const personal_information = await PersonalInformation.create(
        {
          first_name,
          last_name,
          full_name,
          contact_id: contact.id,
          address_id: address.id,
          created_by: user_id,
          updated_by: user_id,
        },
        trx
      );

      //Store Candidate
      const {
        industry_id,
        position_id,
        email,
        title,
        link_profile,
        hot_item,
        hot_item_date,
        source_type_id,
        current_company,
        blueSheet,
        specialty_id,
        subspecialty_id,
      } = candidateData;
      let { recruiter_id } = candidateData;
      const res = await RecruiterRepository.canAssign(recruiter_id, user_id);
      if (res.success) {
        recruiter_id = res.data;
      } else {
        trx && (await trx.rollback());
        return res;
      }
      const candidate = await Candidate.create(
        {
          personal_information_id: personal_information.id,
          industry_id,
          position_id,
          recruiter_id,
          email,
          title,
          link_profile,
          hot_item,
          hot_item_date,
          current_company,
          source_type_id,
          created_by: user_id,
          updated_by: user_id,
          specialty_id,
          subspecialty_id,
          status_id: blueSheet.status_id || CandidateStatusSchemes.Ongoing,
        },
        trx
      );

      await CandidateRecruiterAssignment.create(
        { candidate_id: candidate.id, recruiter_id: candidate.recruiter_id, coach_id: user_id },
        trx
      );
      
      //Bluesheet and relocation store
      const blue_sheet = await BlueSheetRepository.create(blueSheet, candidate.id, trx);
      if (!blue_sheet.success) {
        trx && (await trx.rollback());
        return {
          success: false,
          code: 500,
          message: 'There was a problem creating the blue_sheet, please try again later',
        };
      }

      //Store CandidateFiles
      const { files } = candidateData;
      if (files) {
        for (const fileId of files) {
          const fileTemp = await Database.table('user_has_temp_files')
            .where('id', fileId)
            .where('user_id', user_id)
            .first();
          if (!fileTemp) continue;
          const fileUrl = await moveFile(fileTemp.file_name, 'attachments/' + fileTemp.file_name);
          await Database.table('user_has_temp_files').where('id', fileId).where('user_id', user_id).del();
          await CandidateHasFile.create(
            {
              candidate_id: candidate.id,
              file_type_id: await fileType('ATTACHMENT'),
              url: fileUrl,
              file_name: fileTemp.original_name,
            },
            trx
          );
        }
      }

      //Store employerCompany
      if (companyId) {
        await this.createEmployerRelationship(candidate.id, companyId, true, user_id, trx);
        await candidate.loadMany({
          employerCompanies: (builder) => builder.transacting(trx).where('is_current_company', true),
        });
      }

      await trx.commit();

      const candidateJson = candidate.toJSON();
      Event.fire(EventTypes.Candidate.Created, { candidate: candidateJson, blueSheet: blue_sheet.data, userId: user_id });

      return {
        success: true,
        message: 'Candidate created successfully',
        code: 201,
        data: candidateJson,
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      await trx.rollback();
      return {
        success: false,
        code: 500,
        message: 'There was a problem creating the candidate, please try again later',
      };
    }
  }

  /**
   * Get the companies that a candidate can belong to
   *
   * @description Returns a list of the possibles companies the candidate can be an employee, based on the old current_company field, which is a simple string
   *
   * @param {Number} candidateId - The candidate from which the companies will be obtained from
   * @param {Number} limit - How many suggestiones will be returned
   *
   * @return {Object[]} The list of suggested companies
   */
   async getSuggestedCompanies(candidateId, limit = 6) {
    try {
      const suggestedCompaniesIds = [];
      const lowSimilarity = '0.20';
      const mediumSimilarity = '0.25';

      const candidate = await Database.table('contacts_directory')
        .where({
          origin_table_id: candidateId,
          role_id: nameTypes.Candidate,
        })
        .first();
      if (!candidate) {
        return {
          success: false,
          code: 404,
          message: 'Candidate not found',
        };
      }

      const oldCurrentCompany = candidate.current_company;
      const cityId = candidate.city_id;
      const stateId = candidate.state_id;

      const shouldSearchForMoreCompanies = () => suggestedCompaniesIds.length < limit && oldCurrentCompany;

      const searchCompaniesInCity = async () => {
        await Database.raw(`SET pg_trgm.similarity_threshold = ${lowSimilarity}`);
        const trigramSearchQuery = NameRepository.getTrigramSearchQuery(oldCurrentCompany);

        return await Database.select('companies.*')
          .from(trigramSearchQuery)
          .where('companies.city_id', cityId)
          .orderBy('similarity', 'desc')
          .orderBy('name', 'asc')
          .limit(limit);
      };

      const searchCompaniesInState = async () => {
        await Database.raw(`SET pg_trgm.similarity_threshold = ${mediumSimilarity}`);
        const trigramSearchQuery = NameRepository.getTrigramSearchQuery(oldCurrentCompany);

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
        const trigramSearchQuery = NameRepository.getTrigramSearchQuery(oldCurrentCompany);

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

      const result = await NameRepository.getCompaniesWithInformation(uniqSuggestedCompanyIds);

      return {
        success: true,
        code: 200,
        data: NameRepository.orderArray(result, uniqSuggestedCompanyIds),
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
   * Creates Candidate-Company Employer relationship
   *
   * @description This method allows the creation of the relationship, takes into account the logic of being active or not, substiting the current company if it is exists
   *
   * @param {Number} candidateId - The candidate, or employee
   * @param {Number} companyId - The company, or the employer
   * @param {Number} userId - The user that is creating this candidate relationship
   * @param {Boolean} isCurrentCompany - Wether or not make the new relation the current one, if true any current company that the candidate had becomes false
   * @param {Object} trx - Transaction to be used in the creation, helpful for any outside transaction
   *
   * @return {Object} the CompanyHasCandidateEmployee object created
   *
   */
  async createEmployerRelationship(candidateId, companyId, isCurrentCompany, userId, trx) {
    const relationExists = await CompanyHasCandidateEmployee.query()
      .where('candidate_id', candidateId)
      .where('company_id', companyId)
      .first();

    if (relationExists) {
      if(relationExists.is_current_company === false && isCurrentCompany){
        await CompanyHasCandidateEmployee.query()
          .transacting(trx)
          .where('candidate_id', candidateId)
          .where('is_current_company', true)
          .update({ is_current_company: false, updated_by: userId });
        await CompanyHasCandidateEmployee.query()
          .transacting(trx)
          .where('id', relationExists.id)
          .update({ is_current_company: isCurrentCompany, updated_by: userId });
      }

      return relationExists;
    }

    if (isCurrentCompany) {
      await CompanyHasCandidateEmployee.query()
        .transacting(trx)
        .where('candidate_id', candidateId)
        .where('is_current_company', true)
        .update({ is_current_company: false, updated_by: userId });
    }

    const employerCompanies = await CompanyHasCandidateEmployee.create(
      {
        candidate_id: candidateId,
        company_id: companyId,
        is_current_company: isCurrentCompany,
        created_by: userId,
        updated_by: userId,
      },
      trx
    );

    return employerCompanies;
  }

  /**
   * Adds a company employer relation to a candidate
   *
   * @description This methods contains the logic to cheeck if the user cand add such relation, then the @method createEmployerRelationship is called
   *
   * @param {Number} candidateId - The candidate, or employee
   * @param {Number} companyId - The company, or the employer
   * @param {Number} userId - The user that is creating this candidate relationship
   *
   * @return {Object} A success with a code 200 and message or an message error with an error code
   *
   */
  async addNewCompanyEmployerRelation(candidateId, companyId, userId) {
    let trx;

    try {
      const candidate = await Candidate.query().where('id', candidateId).first();
      if (!candidate) {
        return {
          success: false,
          code: 404,
          message: 'Candidate not found',
        };
      }
      
      const candidateBelongsRecruiter = await this.isARecruiterAssigned(candidateId, userId);

      if (!candidateBelongsRecruiter) {
        return {
          success: false,
          code: 403,
          message: 'You cannot modify the candidate employer company',
        };
      }

      trx = await Database.beginTransaction();

      await this.createEmployerRelationship(candidateId, companyId, true, userId, trx);

      await trx.commit();

      const result = await this.details(candidateId);

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
        message: 'There was a problem while adding the employer company to the candidate',
      };
    }
  }

  /**
   * Returns a custom response that determines
   * the update of the candidate
   *
   * @method create
   *
   * @param {Object} contactData
   * @param {Object} addressData
   * @param {Object} personalInfoData
   * @param {Object} candidateData
   * @param {Integer} user_id
   * @param {Number?} companyId - Used to create the employer company relationship
   *
   * @return {Object} A success with a code 200 and message or an message error with an error code
   *
   */
  async update(candidateId, contactData, addressData, personalInfoData, candidateData, user_id, companyId = null) {
    const candidate = await Candidate.findOrFail(candidateId);
    const personal_information = await PersonalInformation.findOrFail(candidate.personal_information_id);
    const contact = await Contact.findOrFail(personal_information.contact_id);
    const rules = {
      personal_email: `max:64|string|uniqueCaseInsensitive:contacts,personal_email,id,${contact.id}`,
    };
    const messages = {
      'personal_email.uniqueCaseInsensitive': 'A candidate with the provided other email already exists'
    }
    const { personal_email } = contactData;
    const validation = await validate(personal_email, rules, messages);
    if (validation.fails()) {
      return {
        code: 400,
        ...validation.messages()[0],
      };
    }
    const address = await Address.findOrFail(personal_information.address_id);

    // transaction
    const trx = await Database.beginTransaction();

    try {
      //Update contact
      const { phone, mobile, personal_email, ext } = contactData;
      await contact.merge({ phone, mobile, personal_email, ext });
      await contact.save(trx);

      //Update Address
      const { zip, city_id } = addressData;
      const zipCode = await LocationRepository.existZipOnCity(zip, city_id);
      if (!zipCode) {
        trx && (await trx.rollback());
        return {
          success: false,
          code: 400,
          message: "The zip code doesn't exist in the selected city",
        };
      }
      const { latitude, longitude } = zipCode;
      const city = await City.find(city_id);
      await address.merge({ city_id, zip, coordinates: `(${longitude},${latitude})`, address: city.title });
      await address.save(trx);

      //Update Personal Information
      const { first_name, last_name } = personalInfoData;
      await personal_information.merge({ first_name, last_name, updated_by: user_id });
      await personal_information.save(trx);

      //Update Employer Company
      if (companyId) {
        await this.createEmployerRelationship(candidateId, companyId, true, user_id, trx);
        await candidate.loadMany({
          employerCompanies: (builder) => builder.transacting(trx).where('is_current_company', true),
        });
      }

      //Update Candidate
      const {
        current_company,
        industry_id,
        position_id,
        email,
        title,
        link_profile,
        source_type_id,
        specialty_id,
        subspecialty_id,
      } = candidateData;
      await candidate.merge({
        current_company,
        industry_id,
        position_id,
        email,
        title,
        link_profile,
        source_type_id,
        updated_by: user_id,
        specialty_id,
        subspecialty_id,
      });
      await candidate.save(trx);

      await trx.commit();

      const updatedCandidate = await this.details(candidateId, 'compact');

      Event.fire(EventTypes.Candidate.Updated, {
        candidateId: candidate.id,
        entity: EntityTypes.Candidate,
        operation: OperationType.Update,
        payload: updatedCandidate,
        userId: user_id,
      });

      return {
        success: true,
        code: 201,
        data: updatedCandidate,
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      await trx.rollback();
      return {
        success: false,
        code: 500,
        message: 'There was a problem updating the candidate, please try again later',
      };
    }
  }

  /**
   * Returns the candidate data with
   * the corresponding relatiions
   *
   * @method details
   *
   * @param {Integer} contactData
   * @param {Boolean} allDetails
   *
   * @return {Object} Candidate Details
   *
   */
  async details(id, mode = 'all', userId = null) {
    const company = await Company.query()
      .select('companies.id', 'companies.name')
      .innerJoin('company_has_candidate_employees as employee', 'companies.id', 'employee.company_id')
      .where('employee.candidate_id', id)
      .where('employee.is_current_company', true)
      .first();

    const query = Candidate.query();
    query
      .select([
        '*',
        Database.raw("COALESCE(:companyName, candidates.current_company, '') as current_company, :companyId as company_id", {
          companyName: company ? company.name : null,
          companyId: company ? company.id : '',
        }),
      ]) //Modify the field current_company
      .where({ id })
      .setHidden([
        'source_type_id',
        'status_id',
        'sub_status_id',
        'personal_information_id',
        'industry_id',
        'specialty_id',
        'subspecialty_id',
        'position_id',
        'recruiter_id',
      ])
      .with('employerCompanies', (builder) => builder.where('is_current_company', true))
      .with('recruiter', userBuilder)
      .with('createdBy', userBuilder)
      .with('additionalRecruiters', (builder) => {
        builder.where('status', '!=', AdditionalRecruiterStatus.Inactive);
        builder.with('recruiter', userBuilder);
        builder.orderBy('created_at', 'desc');
      })
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
      });

    if (mode === 'compact' || mode === 'all') {
      query
        .with('specialty', (builder) => {
          builder.setHidden(['industry_id', ...auditFields]);
          builder.with('industry', (builder) => {
            builder.setHidden(auditFields);
          });
        })
        .with('subspecialty', (builder) => {
          builder.setHidden(auditFields);
        })
        .with('position', (builder) => {
          builder.setHidden(['industry_id', ...auditFields]);
        })
        .with('sendouts', (builder) => {
          builder.setHidden(['candidate_id', 'job_order_id', 'sendout_type_id', 'sendout_status_id', 'sendout_email_detail_id', 'job_order_accountable_id', 'candidate_accountable_id', ...auditFields])
          builder.where('deleted', false)
          builder.orderBy('created_at', 'desc')
          builder.with('type', builder => builder.setHidden(auditFields))
          builder.with('eventLogs', builder => {
            builder.setHidden(auditFields)
            builder.select('id, sendout_id', 'event_type_id', 'event_details', Database.raw('COALESCE(real_date, created_at) as created_at'))
          })
          .with('eventLogs.user', (builder) => {
            builder.setHidden([...userFields, ...auditFields, 'job_title', 'manager_id']);
            builder.with('personalInformation', builder => {
              builder.select(['id', 'full_name']);
            });
          })
          .with('eventLogs.eventType', (builder) => {
            builder.setHidden(auditFields)
          })
          builder.with('status', builder => {
            builder.select(['id', 'title', 'style as color']);
            builder.setHidden(['sendout_type_id', ...auditFields]);
            builder.with('type', builder => {
              builder.setHidden([...auditFields]);
            });
          })
          builder.with('candidate', builder => {
            builder.setHidden(auditFields);
            builder.with('personalInformation', builder => {
              builder.with('contact', (builder) => {
                builder.setHidden([...auditFields]);
              })
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
            builder.with('additionalRecruiters', (builder) => {
              builder.where('status', '!=', AdditionalRecruiterStatus.Inactive);
              builder.with('recruiter', userBuilder);
              builder.orderBy('created_at', 'desc');
            });
            builder.with('recruiter', builder => {
              builder.setHidden([...userFields, ...auditFields, 'job_title']);
              builder.with('personalInformation', builder => {
                builder.select(['id', 'full_name']);
              });
            })
          })
          builder.with('jobOrderAccountableDig');
          builder.with('candidateAccountableDig');
          
          builder.with('joborder', builder => {
            builder.setHidden(auditFields);
            builder.with('recruiter', builder => {
              builder.setHidden([...userFields, ...auditFields, 'job_title']);
              builder.with('personalInformation', builder => {
                builder.select(['id', 'full_name']);
              });
            })
            
            builder.with('company', builder => {
              builder.setHidden([...userFields, ...auditFields]);
            })
            builder.with('additionalRecruiters', (builder) => {
              builder.where('status', '!=', AdditionalRecruiterStatus.Inactive);
              builder.with('recruiter', userBuilder);
              builder.orderBy('created_at', 'desc');
            });
          })
          builder.with('attachments', (builder) => builder.setHidden(auditFields)),
          builder.with('interviews', builder => {
            builder.setHidden(['interview_type_id', ...auditFields]);
            builder.with('interviewType', builder => {
              builder.setHidden([...auditFields]);
            });
          })
          builder.with('hiringAuthorithies', builder => {
            builder.setHidden(['hiring_authority_id', ...auditFields]);
            builder.with('hiringAuthority', builder => {
              builder.setHidden(['company_id', ...auditFields]);
            });
          })
          builder.with('emailDetails', builder => {
            builder.setHidden(['sendout_template_id', ...auditFields]);
          })
          builder.with('jobOrderAccountable', builder => {
            builder.setHidden([...userFields, ...auditFields, 'job_title']);
            builder.with('personalInformation', builder => {
              builder.select(['id', 'full_name']);
            });
          })
          builder.with('candidateAccountable', builder => {
            builder.setHidden([...userFields, ...auditFields, 'job_title']);
            builder.with('personalInformation', builder => {
              builder.select(['id', 'full_name']);
            });
          })
        })
        .with('blueSheets', (builder) => {
          builder.setHidden(['candidate_id', 'created_at', 'updated_at']);
          builder.with('relocations', (builder) => {
            builder.setHidden(['city_id', 'blue_sheet_id', 'created_at', 'updated_at']);
            builder.with('city', (builder) => {
              builder.setHidden(['created_at', 'updated_at', 'state_id']);
              builder.with('state', (builder) => {
                builder.setHidden(['created_at', 'updated_at', 'country_id']);
              });
            });
          });
          builder.with('timeToStart', (builder) => {
            builder.select(['title', 'id']);
          });
          builder.with('candidateType', (builder) => {
            builder.select(['title', 'id', 'style_class_name', 'style_class_name as color']);
          });
          builder.with('workTypeOption', (builder) => {
            builder.select(['title', 'id']);
          });
        })
        .with('status', (builder) => {
          builder.select(['id', 'title', 'style', 'style as color']);
        })
        .with('sourceType', (builder) => {
          builder.setHidden([...auditFields]);
        });
    }

    if (mode === 'all') {
      this.withAllListings(query);
    }

    const candidate = await query.first();
    if (!candidate) {
      return null;
    }
    const candidateJson = candidate.toJSON();
    const coach = await RecruiterRepository.getCoachInfoByRecruiterId(candidate.recruiter_id);

    if(candidateJson.recruiter){
      const isOffice = await UserRepository.isOfficeUser(candidate.recruiter_id);
      candidateJson.recruiter.isOffice = isOffice;
    }

    for (const additionalRecruiter of candidateJson.additionalRecruiters) {
      additionalRecruiter.coach = await RecruiterRepository.getCoachInfoByRecruiterId(additionalRecruiter.recruiter_id);
      additionalRecruiter.isOffice = await UserRepository.isOfficeUser(additionalRecruiter.recruiter_id);
    }

    if (mode === 'all') {
      for (const file of candidateJson.files) {
        file.size = await this.getFileSize(file);
      }
    }

    const shouldAskRecruiterAddEmployer = await this.shouldRecruiterAddEmployer(id, userId);

    return {
      ...candidateJson,
      coach: coach || null,
      shouldAskRecruiterAddEmployer,
    };
  }

  /**
   * Method to get the size if don't exist
   * @param {Object} file.size It's file schema from DB 
   * @returns {Number} Size file in bytes the original or calculated
   */
  async getFileSize(file) {
    if (file.size) return file.size;

    const fileRelativePath = extractRelativePathFromBlobUrl(file.url);
    const fileProperties = await readFilePropertiesFromPath(fileRelativePath);
    const { contentLength } = fileProperties;
    return contentLength;
  }

 /**
   * Returns wether or not the recruiter should add an employer to the candidate
   *
   * @description When a candidate does not have an employer, the front should show a modal asking the user to add a company, this method expectes to return such flag
   *
   * @param {Number} candidateId - The candidate the recruiter is visiting
   * @param {Number} userId - The user visting the candidate's profile
   *
   * @return {Boolean} If the user should add an employer or not
   */
  async shouldRecruiterAddEmployer(candidateId, userId) {
    const rawCandidate = await Candidate.query()
      .where('id', candidateId)
      .with('employerCompanies', (builder) => builder.where('is_current_company', true))
      .first();
    if (!rawCandidate) return false;

    const candidate = rawCandidate.toJSON();

    const candidateBelongsRecruiter = await this.isARecruiterAssigned(candidateId, userId);

    return (candidateBelongsRecruiter && candidate.employerCompanies.length <= 0)
  }

  /**
   * Applies all the relations
   * to the candidate query
   *
   * @method details
   *
   * @param {Knex} query
   *
   */
  async withAllListings(query) {
    query
      .with('files', (builder) => {
        builder.setHidden(['file_type_id', 'candidate_id']);
        builder.with('fileType', (builder) => {
          builder.setHidden(auditFields);
        });
      })
      .with('notes', (builder) => {
        builder.setHidden(['candidate_id', 'user_id']);
        builder.orderBy('created_at', 'desc');
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
      .with('activityLogs', (builder) => {
        builder.setHidden(['candidate_id', 'user_id']);
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
      .with('jobOrders', (builder) => {
        builder.setHidden([
          'hiring_authority_id',
          'company_id',
          'industry_id',
          'specialty_id',
          'subspecialty_id',
          'position_id',
          'address_id',
          'status_id',
          'migration_record',
          'migration_record_changed',
          'searchable_text',
          'specialty_id',
          'subspecialty_id',
          'source',
          'open_since',
          'hot_item_date',
          'hot_item',
          'different_location',
          'recruiter_id',
          ...auditFields,
        ]);
        builder.with('recruiter', (builder) => {
          builder.setHidden([
            'personal_information_id',
            'user_id',
            'double_authentication',
            'step_wizard',
            'user_status_id',
            ...auditFields,
          ]);
        });
        builder.with('company', (builder) => {
          builder.setHidden(['industry_id', 'contact_id', 'address_id', 'recruiter_id', ...auditFields]);
        });
        builder.with('position', (builder) => {
          builder.setHidden(['industry_id', ...auditFields]);
        });
        builder.with('specialty', (builder) => {
          builder.setHidden(['industry_id', ...auditFields]);
          builder.with('industry', (builder) => {
            builder.setHidden(auditFields);
          });
        });
        builder.with('subspecialty', (builder) => {
          builder.setHidden(auditFields);
        });
        builder.with('address', (builder) => {
          builder.setHidden(['city_id', ...auditFields]);
          builder.with('city', (builder) => {
            builder.setHidden(['state_id', ...auditFields]);
            builder.with('state', (builder) => {
              builder.setHidden(['country_id', ...auditFields]);
              builder.with('country', (builder) => {
                builder.setHidden([...auditFields]);
              });
            });
          });
        });
        builder.with('whiteSheet', (builder) => {
          builder.setHidden([
            'job_order_id',
            'job_order_type_id',
            'discussing_agreement_complete',
            'fee_agreement_percent',
            'time_position_open',
            'position_filled',
            'benefits',
            'background_requirements',
            'preset_interview_dates',
            'notes',
            'warranty_time_in_days',
            ...auditFields,
          ]);
        });
      });
  }

  /**
   * Returns a custom response that determines
   * the creation of a note
   *
   * @method createNote
   *
   * @param {String} body
   * @param {String} title
   * @param {Integer} candidateId
   * @param {Integer} userId
   *
   * @return {Object} A success with a code 201 and the note created or an error code
   *
   */
  async createNote(body, title, candidateId, userId) {
    const candidate = await Candidate.find(candidateId);
    if (!candidate) {
      return {
        success: false,
        code: 404,
        message: 'Candidate not found',
      };
    }
    try {
      const candidateNote = await CandidateNote.create({
        body,
        title,
        user_id: userId,
        candidate_id: candidateId,
      });
      await candidateNote.load('user', (builder) => {
        builder.setHidden([
          'personal_information_id',
          'user_id',
          'double_authentication',
          'step_wizard',
          'user_status_id',
          ...auditFields,
        ]);
      });
      return {
        success: true,
        code: 201,
        data: candidateNote,
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      return {
        success: false,
        code: 500,
        message: 'There was a problem creating the Candidate note, please try again later',
      };
    }
  }

  /**
   * Returns a custom response that determines
   * the update of a note
   *
   * @method updateNote
   *
   * @param {String} body
   * @param {String} title
   * @param {Integer} noteId
   * @param {Integer} candidateId
   * @param {Integer} userId
   *
   * @return {Object} A success with a code 201 and the note updated or an error code
   *
   */
  async updateNote(body, title, noteId, candidateId, userId) {
    const candidateNote = await CandidateNote.query().where('id', noteId).where('candidate_id', candidateId).first();
    if (!candidateNote) {
      return {
        success: false,
        code: 404,
        message: 'Note not found',
      };
    }
    if (candidateNote.user_id != userId) {
      return {
        success: false,
        code: 403,
        isInactive: false,
        redirect: false,
        message: "You don't have the permission required to use the resource",
      };
    }
    try {
      await candidateNote.merge({ body, title });
      await candidateNote.save();

      Event.fire(EventTypes.Candidate.NoteUpdated, {
        candidateId,
        entity: EntityTypes.Note,
        operation: OperationType.Update,
        payload: candidateNote,
        userId,
      });

      await candidateNote.load('user', (builder) => {
        builder.setHidden([
          'personal_information_id',
          'user_id',
          'double_authentication',
          'step_wizard',
          'user_status_id',
          ...auditFields,
        ]);
      });
      return {
        success: true,
        code: 201,
        data: candidateNote,
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      return {
        success: false,
        code: 500,
        message: 'There was a problem updating the Candidate note, please try again later',
      };
    }
  }

  /**
   * Returns a custom response that determines
   * the delete of a note
   *
   * @method deleteNote
   *
   * @param {Integer} noteId
   * @param {Integer} candidateId
   * @param {Integer} userId
   *
   * @return {Object} A success with a code 200  or an error code
   *
   */
  async deleteNote(noteId, candidateId, userId) {
    const candidateNote = await CandidateNote.query().where('id', noteId).where('candidate_id', candidateId).first();
    if (!candidateNote) {
      return {
        success: false,
        code: 404,
        message: 'Note not found',
      };
    }
    if (candidateNote.user_id != userId) {
      return {
        success: false,
        code: 403,
        isInactive: false,
        redirect: false,
        message: "You don't have the permission required to use the resource",
      };
    }
    try {
      await candidateNote.delete();

      Event.fire(EventTypes.Candidate.NoteDeleted, {
        candidateId,
        entity: EntityTypes.Note,
        operation: OperationType.Delete,
        payload: candidateNote,
        userId,
      });

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
        message: 'There was a problem deleting the Candidate note, please try again later',
      };
    }
  }

  /**
   * Returns a custom response that determines
   * the creation of an activity
   *
   * @method createActivityLog
   *
   * @param {String} body
   * @param {Integer} activityLogTypeId
   * @param {Integer} candidateId
   * @param {Integer} userId
   * @param {Object} optionalParams - An object that contains optional/extra params, trying not to put too many unnecessaries params
   *
   * @return {Object} A success with a code 201 and the activity  or an error code
   *
   */
  async createActivityLog(body, activityLogTypeId, candidateId, userId, optionalParams = {}) {
    const candidate = await Candidate.find(candidateId);

    if (!candidate) {
      return {
        success: false,
        code: 404,
        message: 'Candidate not found',
      };
    }
    const {
      metadata = {},
      createdBySystem = false,
      externalTrx = null,
      dateUpdated = null,
      enableFreeGame = true,
    } = optionalParams
    let trx;

    try {
      trx = externalTrx ? externalTrx : await Database.beginTransaction();

      const candidateActivityLog = await CandidateActivityLog.create({
        body,
        user_id: userId,
        activity_log_type_id: activityLogTypeId,
        candidate_id: candidateId,
        created_by_system: createdBySystem,
        metadata, //Should maybe store the whole destructuring above^?
      }, trx);

      if(!externalTrx) {
        await trx.commit();
      }

      // FOR UPDATING DATE IF IT'S AN ACT LOG FROM RC API
      if(dateUpdated){
        await candidateActivityLog.merge({ created_at: dateUpdated});
        await candidateActivityLog.save();
      }

      await this.updateActivityDate(candidate, { useNowAsDate: true });

      await candidateActivityLog.loadMany({
        activityLogType: (builder) => builder.setHidden(auditFields),
        bulkReference: (builder) => builder.setHidden(auditFields),
        user: (builder) =>
          builder.setHidden([
            'personal_information_id',
            'user_id',
            'double_authentication',
            'step_wizard',
            'user_status_id',
            'email_signature',
            ...auditFields,
          ]),
      });


      if(enableFreeGame && !Helpers.isAceCommand()){
        await this.markCandidatesFreeGame({ candidateId });
      }

      Event.fire(EventTypes.Candidate.ActivityCreated, { candidateId });

      const result = candidateActivityLog.toJSON();
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
        message: 'There was a problem creating the Candidate activity, please try again later',
      };
    }
  }

  /**
   * Returns a custom response that determines
   * the update of an activity
   *
   * @method updateActivityLog
   *
   * @param {String} body
   * @param {Integer} activityLogId
   * @param {Integer} candidateId
   * @param {Integer} userId
   *
   * @return {Object} A success with a code 201 and the activity  or an error code
   *
   */
  async updateActivityLog(body, activityLogId, candidateId, userId) {
    const candidateActivityLog = await CandidateActivityLog.query()
      .where('id', activityLogId)
      .where('candidate_id', candidateId)
      .first();
    if (!candidateActivityLog) {
      return {
        success: false,
        code: 404,
        message: 'ActivityLog not found',
      };
    }
    if (candidateActivityLog.user_id != userId) {
      return {
        success: false,
        code: 403,
        isInactive: false,
        redirect: false,
        message: "You don't have the permission required to use the resource",
      };
    }
    if (candidateActivityLog.created_by_system) {
      return {
        success: false,
        code: 409,
        message: Antl.formatMessage('messages.error.activityFromSystem'),
      };
    }
    try {
      await candidateActivityLog.merge({ body });
      await candidateActivityLog.save();

      Event.fire(EventTypes.Candidate.ActivityUpdated, {
        candidateId,
        entity: EntityTypes.Activity,
        operation: OperationType.Update,
        payload: candidateActivityLog,
        userId,
      });

      await candidateActivityLog.loadMany({
        activityLogType: (builder) => builder.setHidden(auditFields),
        user: (builder) =>
          builder.setHidden([
            'personal_information_id',
            'user_id',
            'double_authentication',
            'step_wizard',
            'user_status_id',
            ...auditFields,
          ]),
      });
      return {
        success: true,
        code: 201,
        data: candidateActivityLog,
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      return {
        success: false,
        code: 500,
        message: 'There was a problem updating the Candidate activity, please try again later',
      };
    }
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
   * @param {Number} activityData[].candidate_id - The activity candidate
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
      const activitiesCreated = await batchInsert(CandidateActivityLog, activityDataWithRecruiter, trx);

      const candidateIds = activityData.map(({ candidate_id }) => candidate_id);
      await Candidate.query().transacting(trx).whereIn('id', candidateIds).update({ last_activity_date: 'now()' });

      if (!externalTrx) await trx.commit();

      Event.fire(EventTypes.Candidate.BatchActivityCreated, { candidateIds });

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
          entity: 'batch candidate activities',
        }),
      };
    }
  }

  async refreshLastActivityDateTableByBatchIds(candidateIds) {
    try {
      await Database.raw(
        `INSERT INTO
        candidate_last_activity_logs (
          candidate_id,
          user_id,
          candidate_activity_log_id,
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
        DISTINCT on (candidate_id) act.candidate_id,
        act.user_id,
        act.id as candidate_activity_log_id,
        act.activity_log_type_id,
        act.body,
        act.created_at,
        act.updated_at,
        act.created_by_system,
        act.metadata,
        act_types.title,
        v_users.user_name
      from
        candidate_activity_logs as act
        inner join activity_log_types as act_types on act.activity_log_type_id = act_types.id
        inner join v_users on act.user_id = v_users.id
      where
        act.candidate_id in ${joinStringForQueryUsage(candidateIds)}
      order by
        candidate_id desc,
        created_at desc 
      ON CONFLICT (candidate_id) DO
      UPDATE
      SET
        candidate_id = excluded.candidate_id,
        user_id = excluded.user_id,
        candidate_activity_log_id = excluded.candidate_activity_log_id,
        activity_log_type_id = excluded.activity_log_type_id,
        body = excluded.body,
        created_at = excluded.created_at,
        updated_at = excluded.updated_at,
        created_by_system = excluded.created_by_system,
        metadata = excluded.metadata,
        title = excluded.title,
        user_name = excluded.user_name
      where
        candidate_last_activity_logs.candidate_id = excluded.candidate_id;`
      );
      return { success: true };
    } catch (error) {
      return { success: false, error };
    }
  }

  async refreshLastActivityDateTableById(candidateId) {
    try {
      await Database.raw(
        `INSERT INTO
        candidate_last_activity_logs (
          candidate_id,
          user_id,
          candidate_activity_log_id,
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
        DISTINCT on (candidate_id) act.candidate_id,
        act.user_id,
        act.id as candidate_activity_log_id,
        act.activity_log_type_id,
        act.body,
        act.created_at,
        act.updated_at,
        act.created_by_system,
        act.metadata,
        act_types.title,
        pi.full_name as user_name
      from
        candidate_activity_logs as act
        inner join activity_log_types as act_types on act.activity_log_type_id = act_types.id
        inner join users on act.user_id = users.id
        inner join personal_informations as pi on users.personal_information_id = pi.id
      where
        act.candidate_id = :candidateId
      order by
        candidate_id desc,
        created_at desc 
      ON CONFLICT (candidate_id) DO
      UPDATE
      SET
        candidate_id = excluded.candidate_id,
        user_id = excluded.user_id,
        candidate_activity_log_id = excluded.candidate_activity_log_id,
        activity_log_type_id = excluded.activity_log_type_id,
        body = excluded.body,
        created_at = excluded.created_at,
        updated_at = excluded.updated_at,
        created_by_system = excluded.created_by_system,
        metadata = excluded.metadata,
        title = excluded.title,
        user_name = excluded.user_name
      where
        candidate_last_activity_logs.candidate_id = :candidateId`,
        { candidateId }
      );
      return { success: true };
    } catch (error) {
      return { success: false, error };
    }
  }

  /**
   * Returns a custom response that determines
   * the deletd of an activity
   *
   * @method deleteActivityLog
   *
   * @param {Integer} activityLogId
   * @param {Integer} candidateId
   * @param {Integer} userId
   *
   * @return {Object} A success with a code 200  or an error code
   *
   */
  async deleteActivityLog(activityLogId, candidateId, userId) {
    const candidateActivityLog = await CandidateActivityLog.query()
      .where('id', activityLogId)
      .where('candidate_id', candidateId)
      .first();
    if (!candidateActivityLog) {
      return {
        success: false,
        code: 404,
        message: 'ActivityLog not found',
      };
    }
    if (candidateActivityLog.user_id != userId) {
      return {
        success: false,
        code: 403,
        isInactive: false,
        redirect: false,
        message: "You don't have the permission required to use the resource",
      };
    }
    if (candidateActivityLog.created_by_system) {
      return {
        success: false,
        code: 409,
        message: Antl.formatMessage('messages.error.activityFromSystem'),
      };
    }
    try {
      await candidateActivityLog.delete();

      Event.fire(EventTypes.Candidate.ActivityDeleted, {
        candidateId,
        entity: EntityTypes.Activity,
        operation: OperationType.Delete,
        payload: candidateActivityLog,
        userId,
      });

      if (!Helpers.isAceCommand()) {
        await this.updateActivityDate(await Candidate.find(candidateId));
        await this.markCandidatesFreeGame({ candidateId });
      }
      
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
        message: 'There was a problem deleting the Candidate activity, please try again later',
      };
    }
  }

  /**
   * Updates the last activity date for a candidate
   *
   * @method updateActivityDate
   *
   * @param {Database} candidate - The database object
   * @param {Date} useNowAsDate - Allows the method to use now as last activity date, expected to be used when an insert/update will result in the last activity date to be technically a now(), but a few ms apart, improving performance
   */
  async updateActivityDate(candidate, { useNowAsDate = false } = {}) {
    const last_activity_date = useNowAsDate ? 'now()' : (await this.getLastActivityDate(candidate.id));

    await candidate.merge({ last_activity_date });
    await candidate.save();
  }

  /**
   * Returns the date from the last activity
   * created for this candidate
   *
   * @method getLastActivityDate
   *
   * @param {Integer} candidateId
   *
   * @return {Object} Activity or null
   */
  async getLastActivityDate(candidateId) {
    const result = await CandidateActivityLog.query().where('candidate_id', candidateId).max('created_at');
    return result.length > 0 ? result[0].max : null;
  }

  /**
   * Returns the basic data from a job order
   *
   * @method getJobOrderBasicInfo
   *
   * @param {Integer} jobOrderId
   *
   * @return {Object} JobOrder
   */
  async getJobOrderBasicInfo(jobOrderId) {
    const query = await JobOrder.query()
      .where({ id: jobOrderId })
      .setHidden([
        'hiring_authority_id',
        'company_id',
        'industry_id',
        'specialty_id',
        'subspecialty_id',
        'position_id',
        'address_id',
        'status_id',
        'migration_record',
        'migration_record_changed',
        'searchable_text',
        'specialty_id',
        'subspecialty_id',
        'source',
        'open_since',
        'hot_item_date',
        'hot_item',
        'different_location',
        ...auditFields,
      ])
      .with('recruiter', (builder) => {
        builder.setHidden([
          'double_authentication',
          'step_wizard',
          'personal_information_id',
          'user_status_id',
          ...auditFields,
        ]);
      })
      .with('company', (builder) => {
        builder.setHidden(['industry_id', 'contact_id', 'address_id', 'recruiter_id', ...auditFields]);
      })
      .with('position', (builder) => {
        builder.setHidden(['industry_id', ...auditFields]);
      })
      .with('specialty', (builder) => {
        builder.setHidden(['industry_id', ...auditFields]);
        builder.with('industry', (builder) => {
          builder.setHidden(auditFields);
        });
      })
      .with('address', (builder) => {
        builder.setHidden(['city_id', ...auditFields]);
        builder.with('city', (builder) => {
          builder.setHidden(['state_id', ...auditFields]);
          builder.with('state', (builder) => {
            builder.setHidden(['country_id', ...auditFields]);
            builder.with('country', (builder) => {
              builder.setHidden([...auditFields]);
            });
          });
        });
      })
      .with('whiteSheet', (builder) => {
        builder.setHidden([
          'job_order_id',
          'job_order_type_id',
          'discussing_agreement_complete',
          'fee_agreement_percent',
          'time_position_open',
          'position_filled',
          'benefits',
          'background_requirements',
          'preset_interview_dates',
          'notes',
          'warranty_time_in_days',
          ...auditFields,
        ]);
      })
      .first();
    return query;
  }

  /**
   * Returns a custom response that contains
   * an array of gouped job orders
   *
   * @method jobOrdersToAssign
   *
   * @param {Integer} candidateId
   *
   * @return {Object} A success with a code 200 and an array of jobs or an error code
   */
  async jobOrdersToAssign(candidateId) {
    const candidate = await Candidate.find(candidateId);
    if (!candidate) {
      return {
        success: false,
        code: 404,
        message: `The candidate with the identifier <${candidateId}> was not found`,
      };
    }
    const specialty = await candidate.specialty().fetch();
    const query = await Database.table('job_orders as jo')
      .select([
        'jo.id',
        'spec.title as specialty',
        'spec.id as specialty_id',
        'itry.title as industry',
        'itry.id as industry_id',
        'pst.title as functional_title',
        'pst.id as position_id',
        'sub.title as subspecialty',
        'sub.id as subspecialty_id',
        'cty.title as city',
        'st.slug as state',
        'companies.name  as company_title',
        'jo.title as title',
      ])
      .innerJoin('companies', 'jo.company_id', 'companies.id')
      .innerJoin('positions as pst', 'jo.position_id', 'pst.id')
      .innerJoin('specialties as spec', 'jo.specialty_id', 'spec.id')
      .leftJoin('subspecialties as sub', 'jo.subspecialty_id', 'sub.id')
      .innerJoin('industries as itry', 'spec.industry_id', 'itry.id')
      .innerJoin('addresses as add', 'jo.address_id', 'add.id')
      .innerJoin('cities as cty', 'add.city_id', 'cty.id')
      .innerJoin('states as st', 'cty.state_id', 'st.id')
      .where('jo.specialty_id', specialty.id)
      .whereNotExists(function () {
        this.from('job_order_has_candidates as jhc')
          .whereRaw('jo.id = jhc.job_order_id')
          .where('jhc.candidate_id', candidateId);
      })
      .orderBy('jo.title');

    const bestMatches = remove(query, (value) => {
      return value.position_id == candidate.position_id && value.specialty_id == specialty.id;
    });
    const bySubspecialty = remove(query, (value) => {
      return value.subspecialty_id == (candidate.subspecialty_id || 0);
    });
    const bySpecialty = query;

    /* Take 200 maximimum temporary while refining matching method */
    const allItems = [
      ...bestMatches.map((each) => ({ ...each, group: 'With the same functional title' })),
      ...bySubspecialty.map((each) => ({ ...each, group: 'In the same subspecialty' })),
      ...bySpecialty.map((each) => ({ ...each, group: 'In the same Specialty' })),
    ].slice(0, 200);

    return {
      code: 200,
      success: true,
      data: allItems,
    };
  }

  /**
   * Returns a custom response that contains
   * the job order assigned
   *
   * @method assignJobOrder
   *
   * @param {Integer} candidateId
   * @param {Integer} jobOrderId
   *
   * @return {Object} A success with a code 200 and a job order
   */
  async assignJobOrder(candidateId, jobOrderId) {
    const candidate = await Candidate.find(candidateId);
    if (!candidate) {
      return {
        success: false,
        code: 404,
        message: `The candidate with the identifier <${candidateId}> was not found`,
      };
    }
    const jobOrderCandidate = await JobOrderHasCandidate.query()
      .where('job_order_id', jobOrderId)
      .where('candidate_id', candidateId)
      .first();
    if (jobOrderCandidate) {
      return {
        success: false,
        code: 400,
        message: `The Job Order already belongs to this candidate`,
      };
    }
    const candidateJobOrderMatch = await JobOrderHasCandidate.create({
      candidate_id: candidateId,
      job_order_id: jobOrderId,
    });
    const jobOrder = await this.getJobOrderBasicInfo(jobOrderId);
    Event.fire(EventTypes.Candidate.JobOrderMatched, { candidateJobOrderMatch });
    return {
      code: 201,
      data: jobOrder,
      message: 'The Job Order was assigned succesfully!',
    };
  }

  /**
   * Returns a custom response that determines
   * that the job was removed from the candidate
   *
   * @method removeJobOrder
   *
   * @param {Integer} candidateId
   * @param {Integer} jobOrderId
   *
   * @return {Object} A success with a code 200
   */
  async removeJobOrder(candidateId, jobOrderId) {
    const candidate = await Candidate.find(candidateId);
    if (!candidate) {
      return {
        success: false,
        code: 404,
        message: `The candidate with the identifier <${candidateId}> was not found`,
      };
    }
    const jobOrderCandidate = await JobOrderHasCandidate.query()
      .where('job_order_id', jobOrderId)
      .where('candidate_id', candidateId)
      .first();
    if (!jobOrderCandidate) {
      return {
        success: false,
        code: 400,
        message: `The job order does not belongs to this candidate`,
      };
    }
    await jobOrderCandidate.delete();
    return {
      code: 200,
      message: 'The Job Order was removed from the Job Order succesfully!',
    };
  }

  async getLastActivity(candidateId) {
    if (!Number.isInteger(Number(candidateId))) {
      throw { message: 'Parameter candidateId must be an integer' };
    }
    const query = Database.select(['alt.title', 'cal.created_at as date', 'pi.full_name as user'])
      .from('candidate_activity_logs as cal')
      .leftJoin('activity_log_types as alt', 'cal.activity_log_type_id', 'alt.id')
      .leftJoin('users', 'cal.user_id', 'users.id')
      .leftJoin('personal_informations as pi', 'users.personal_information_id', 'pi.id')
      .where('candidate_id', candidateId)
      .whereRaw('cal.created_at = (select max(created_at) from candidate_activity_logs where candidate_id = ? )', [
        candidateId,
      ]);
    return await query.first();
  }

  async createFromName(req, user_id, name_id) {
    let name = await Name.find(name_id);
    if (!name) {
      return {
        success: false,
        code: 404,
        message: `The name with the identifier <${name_id}> was not found`,
      };
    }
    if (!(await NameRepository.canCreateCandidateFromName(name))) {
      return {
        success: false,
        code: 400,
        message: `A candidate from this name already exist`,
      };
    }
    const trx = await Database.beginTransaction();

    const personalInfo = await name.personalInformation().fetch();
    const address = await personalInfo.address().fetch();
    const contact = await personalInfo.contact().fetch();

    try {
      //Update contact
      const contactData = req.only(['phone', 'mobile', 'personal_email', 'ext']);
      await contact.merge(contactData);
      await contact.save(trx);

      //Update Address
      const { zip, city_id } = req.only(['zip', 'city_id']);
      const zipCode = await LocationRepository.existZipOnCity(zip, city_id);
      if (!zipCode) {
        trx && (await trx.rollback());
        return {
          success: false,
          code: 400,
          message: "The zip code doesn't exist in the selected city",
        };
      }

      const { latitude, longitude } = zipCode;
      const city = await City.find(city_id);
      await address.merge({ city_id, zip, coordinates: `(${longitude},${latitude})`, address: city.title });
      await address.save(trx);

      //Update Personal Information
      const { first_name, last_name } = req.only(['first_name', 'last_name']);
      await personalInfo.merge({ first_name, last_name, updated_by: user_id });
      await personalInfo.save(trx);

      //Store Candidate
      const candidateData = req.only([
        'industry_id',
        'position_id',
        'status_id',
        'email',
        'title',
        'link_profile',
        'hot_item',
        'hot_item_date',
        'source_type_id',
        'current_company',
        'specialty_id',
        'subspecialty_id',
      ]);
      let { recruiter_id } = req.only(['recruiter_id']);
      const res = await RecruiterRepository.canAssign(recruiter_id, user_id);
      if (res.success) {
        recruiter_id = res.data;
      } else {
        trx && (await trx.rollback());
        return res;
      }
      const candidate = await Candidate.create(
        {
          ...candidateData,
          recruiter_id,
          personal_information_id: personalInfo.id,
          created_by: user_id,
          updated_by: user_id,
        },
        trx
      );
      //Bluesheet and relocation store
      const { blueSheet } = req.only(['blueSheet']);
      const blue_sheet = await BlueSheetRepository.create(blueSheet, candidate.id, trx);
      if (!blue_sheet.success) {
        trx && (await trx.rollback());
        return {
          success: false,
          code: 500,
          message: 'There was a problem creating the blue_sheet, please try again later',
        };
      }

      //Store CandidateFiles
      const { files } = req.only(['files']);
      if (files) {
        const uploadedFiles = await this.storeCandidateFiles(files, candidate.id, user_id, trx);
        if (!uploadedFiles.success) {
          trx && (await trx.rollback());
          return {
            success: false,
            code: 500,
            message: 'There was a problem storing the files, please try again later',
          };
        }
      }

    const companyId = req.input('company_id');

    //Store employerCompany
    if (companyId) {
      await this.createEmployerRelationship(candidate.id, companyId, true, user_id, trx);
      await candidate.loadMany({
        employerCompanies: (builder) => builder.transacting(trx).where('is_current_company', true),
      });
    }

      await this.copyDataFromName(name, candidate.id, trx);

      await CandidateFromName.create({ name_id: name.id, candidate_id: candidate.id }, trx);

      name.convertion_date = moment().format(DateFormats.SystemDefault);
      await name.save(trx);

      await trx.commit();

      const candidateJson = candidate.toJSON();
      Event.fire(EventTypes.Candidate.Created, { candidate: candidateJson, blueSheet: blue_sheet.data });
      Event.fire(EventTypes.Name.Converted, { id: name.id });
      return {
        success: true,
        code: 201,
        data: candidate,
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      trx && (await trx.rollback());
      return {
        success: false,
        code: 500,
        message: 'There was a problem creating the candidate, please try again later',
      };
    }
  }

  async storeCandidateFiles(files, candidate_id, user_id, trx) {
    try {
      for (const fileId of files) {
        const fileTemp = await Database.table('user_has_temp_files')
          .where('id', fileId)
          .where('user_id', user_id)
          .first();
        if (!fileTemp) continue;
        const fileUrl = await moveFile(fileTemp.file_name, 'attachments/' + fileTemp.file_name);
        await Database.table('user_has_temp_files').where('id', fileId).where('user_id', user_id).del();
        await CandidateHasFile.create(
          {
            candidate_id,
            file_type_id: await fileType('ATTACHMENT'),
            url: fileUrl,
            file_name: fileTemp.original_name,
          },
          trx
        );
      }
      return { success: true };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
      return { success: false };
    }
  }

  async copyDataFromName(name, candidate_id, trx) {
    const files = (await name.files().fetch()).rows;
    await Database.raw(
      `
      INSERT INTO candidate_activity_logs (user_id, candidate_id, body, activity_log_type_id, created_at, updated_at)
      SELECT user_id, ${candidate_id} as candidate_id, body, activity_log_type_id, created_at, updated_at FROM name_activity_logs WHERE name_id = ${name.id}
    `
    ).transacting(trx);

    await Database.raw(
      `
      INSERT INTO candidate_notes(user_id, candidate_id, body, title, created_at, updated_at)
      SELECT user_id, ${candidate_id} as candidate_id, body, title, created_at, updated_at FROM name_notes WHERE name_id = ${name.id}
    `
    ).transacting(trx);

    for (const file of files) {
      const destinationFileName = `Candidate copy ${file.file_name}`;

      const fileCopyResult = await copyFile(file.url, 'attachments', destinationFileName);
      if (!fileCopyResult.success) {
        throw { success: false, message: `Fail to copy file ${file.url}` };
      }
      const newFile = {
        candidate_id: candidate_id,
        file_type_id: file.file_type_id,
        file_name: destinationFileName,
        url: fileCopyResult.url,
      };
      await CandidateHasFile.create(newFile, trx);
    }
  }

  async assignToRecruiter(candidateId, recruiterId, userId) {
    try {
      const candidate = await Candidate.find(candidateId);
      if (!candidate) {
        return {
          success: false,
          code: 404,
          message: 'Candidate not found',
        };
      }

      const recruiter = await User.find(recruiterId);
      if (!recruiter) {
        return {
          success: false,
          code: 404,
          message: 'Recruiter not found',
        };
      }
      const res = await RecruiterRepository.canAssign(recruiter.id, userId);
      if (!res.success) {
        return res;
      }

      if (candidate.recruiter_id == recruiter.id || (await this.isARecruiterAssigned(candidateId, recruiter.id))) {
        return {
          success: false,
          code: 400,
          message: 'Recruiter already assigned. Remove that assignment first and try again.'
        };
      }

      const previousRecruiterId = candidate.recruiter_id;
      candidate.recruiter_id = recruiter.id;
      const recruiterAssignment = await CandidateRecruiterAssignment.create(
        { candidate_id: candidate.id, recruiter_id: candidate.recruiter_id, coach_id: userId }
      );
      await candidate.save();

      await recruiter.loadMany({
        personalInformation: (builder) => {
          builder.setHidden('contact_id', auditFields);
          builder.with('contact', ...auditFields);
        }
      })
      
      Event.fire(EventTypes.Candidate.RecruiterReassigned, { recruiterAssignment, previousRecruiterId, userId });
      return {
        success: true,
        code: 200,
        data: recruiter,
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
      return { success: false, code: 500, message: 'There was a problem assigning recruiter, please try again after' };
    }
  }

  async getAssignationHistory(candidateId) {
    const candidate = await Candidate.find(candidateId);
    if (!candidate) {
      return {
        success: false,
        code: 404,
        message: 'Candidate not found',
      };
    }
    try {
      const data = await Database.select([
        'cra.id',
        'pi_creator.full_name as creator',
        'pi_recruiter.full_name as recruiter',
        'pi_other_recruiter.full_name as other_recruiter',
        'cra.created_at as date',
        'cra.type',
        'cra.action'
      ])
        .from('candidate_recruiter_assignments as cra')
        .join('users as creator', 'creator.id', 'cra.coach_id')
        .leftJoin('users as otherRecruiter', 'otherRecruiter.id', 'cra.another_recruiter_id')
        .join('users as recruiter', 'recruiter.id', 'cra.recruiter_id')
        .join('personal_informations as pi_creator', 'pi_creator.id', 'creator.personal_information_id')
        .join('personal_informations as pi_recruiter', 'pi_recruiter.id', 'recruiter.personal_information_id')
        .leftJoin('personal_informations as pi_other_recruiter', 'pi_other_recruiter.id', 'otherRecruiter.personal_information_id')

        .where('candidate_id', candidateId)
        .orderBy('cra.created_at', 'desc');
      return {
        success: true,
        code: 200,
        data: data,
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
      return { success: false, code: 500, message: 'There was a problem getting information' };
    }
  }

  /**
   * @deprecated  
   * 
   * Generates
   * the metrics to evaluate the candidate
   *
   * @method initializeOperatingMetrics
   *
   * @param {Integer} candidateId
   *
   *
   */
  async initializeOperatingMetrics(candidateId, userId) {
    try {
      const candidate = await Candidate.find(candidateId);
      if (!candidate) {
        return null;
      }
      const seventyTwoHoursInms = 72 * (60 * 60 * 1000);
      const templateMetrics = await OperatingMetricConfiguration.findByOrFail('entity', EntityTypes.Candidate);
      const range = humanInterval(templateMetrics.metric_frequency) || seventyTwoHoursInms;
      const start_date = moment().format(DateFormats.SystemDefault);
      const end_date = moment(start_date).subtract(1, 'minutes').add(range, 'milliseconds').format(DateFormats.SystemDefault);
      const lastOperating = await CandidateOperatingMetric.query()
        .where('candidate_id', candidateId)
        .where('created_by', userId)
        .orderBy('start_date', 'desc')
        .first();
      if (lastOperating) {
        const activitiesNoRecurrents = filter(lastOperating.checklist, function (value) {
          return value.completed && !value.recurrent;
        });
        for (const activity of activitiesNoRecurrents) {
          const position = findIndex(templateMetrics.checklist, function (value) {
            return activity.activityId == value.activityId;
          });
          if (position != -1) {
            templateMetrics.checklist[position].completed = true;
            templateMetrics.checklist[position].reference = activity.reference;
            templateMetrics.checklist[position].completedAt = activity.completedAt;
          }
        }
      }
      const operatingMetric = await CandidateOperatingMetric.create({
        candidate_id: candidateId,
        start_date,
        end_date,
        checklist: templateMetrics.checklist,
        created_by: userId,
      });
      return operatingMetric;
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
    }
  }

  /**
   * @deprecated  
   * 
   * Evaluates if the activity created meet the requeriments to
   * complete an existing metric
   *
   * @method evaluateActivityMetricOnCreation
   *
   * @param {Object} candidateActivityLog
   *
   * @return {Object} operatingMetric
   */
  async evaluateMetricOnActivityCreation(candidateActivityLog) {
    let operatingMetric = null;
    const { candidate_id ,user_id } = candidateActivityLog;
    const candidate = await Candidate.find(candidate_id);
    if (!candidate) {
      return null;
    }
    const blueSheet = await BlueSheetRepository.getByCandidate(candidate_id);
    const additionalRecruiter =  await this.existAdditionalRecruiter({
      candidateId: candidate_id,
      status: AdditionalRecruiterStatus.Approved,
      recruiterId: user_id
    });
    if(!additionalRecruiter && candidate.recruiter_id !== user_id){
      return null;
    }
    const ownerMetricId = additionalRecruiter
    ? additionalRecruiter.type === AdditionalRecruiterTypes.Accountable
      ? user_id
      : additionalRecruiter.recruiter_to_collaborate_id
    : candidate.recruiter_id;
    const metrics = await CandidateOperatingMetric.query().where('candidate_id', blueSheet.candidate_id).where('created_by',ownerMetricId).fetch();
    if (metrics.rows.length === 0) {
      operatingMetric = await this.initializeOperatingMetrics(blueSheet.candidate_id,ownerMetricId);
      Event.fire(EventTypes.Candidate.MetricsInitialized, { candidateId: blueSheet.candidate_id, userId: ownerMetricId });
    } else {
      operatingMetric = await this.getMetricWithActivity(candidateActivityLog, 'false', ownerMetricId);
    }
    if (!operatingMetric) {
      return null;
    }
    const position = findIndex(operatingMetric.checklist, function (value) {
      return value.activityId == candidateActivityLog.activity_log_type_id 
              || value.alternateActivityId == candidateActivityLog.activity_log_type_id;
    });
    if (position != -1) {
      operatingMetric.checklist[position].completed = true;
      operatingMetric.checklist[position].completedAt = moment().format(DateFormats.SystemDefault);
      operatingMetric.checklist[position].reference = candidateActivityLog;
      operatingMetric.updated_by = ownerMetricId;
      await operatingMetric.save();
    }
    Event.fire(EventTypes.Candidate.CheckMetricStatus, { operatingMetric });
  }

  /**
   * Evaluates if the deleted activity affects a completed
   * metric
   *
   * @method evaluateActivityMetricOnDelete
   *
   * @param {Object} candidateActivityLog
   *
   * @deprecated  
   */
  async evaluateMetricOnActivityDelete(candidateActivityLog) {
    const { candidate_id ,user_id } = candidateActivityLog;
    const candidate = await Candidate.find(candidate_id);
    if (!candidate) {
      return null;
    }
    const additionalRecruiter =  await this.existAdditionalRecruiter({
      candidateId: candidate_id,
      status: AdditionalRecruiterStatus.Approved,
      recruiterId: user_id
    });
    if(!additionalRecruiter && candidate.recruiter_id !== user_id){
      return null;
    }
    const ownerMetricId = additionalRecruiter
    ? additionalRecruiter.type === AdditionalRecruiterTypes.Accountable
      ? user_id
      : additionalRecruiter.recruiter_to_collaborate_id
    : candidate.recruiter_id;
    const operatingMetric = await this.getMetricWithActivity(candidateActivityLog, 'true', ownerMetricId);
    if(!operatingMetric){
      return null;
    }
    const start_date = moment(operatingMetric.start_date).format(DateFormats.SystemDefault);
    const end_date = moment(operatingMetric.end_date).format(DateFormats.SystemDefault);
    const activity = await CandidateActivityLog.query()
      .where('candidate_id', candidateActivityLog.candidate_id)
      .where('activity_log_type_id', candidateActivityLog.activity_log_type_id)
      .where(function(){
        this.where('user_id', candidateActivityLog.user_id)
        additionalRecruiter ?   this.orWhere('user_id',ownerMetricId) : null
      })
      .whereRaw(`created_at at time zone 'utc' BETWEEN '${start_date}'::timestamp  AND '${end_date}'::timestamp `)
      .orderBy('created_at', 'asc')
      .first();
    const position = findIndex(operatingMetric.checklist, function (value) {
      return value.activityId == candidateActivityLog.activity_log_type_id
              || value.alternateActivityId == candidateActivityLog.activity_log_type_id;
      
    });
    if (position != -1) {
      if (!activity && !operatingMetric.checklist[position].recurrent) {
        await this.unmarkRecurrentActivity(candidateActivityLog, ownerMetricId);
      } else if (!activity) {
        operatingMetric.checklist[position].completed = false;
        operatingMetric.updated_by = candidateActivityLog.user_id;
        await operatingMetric.save();
      } else if (operatingMetric.checklist[position].reference.id == candidateActivityLog.id) {
        operatingMetric.checklist[position].reference = activity;
        operatingMetric.updated_by = activity.user_id;
        await operatingMetric.save();
      }
    }
  }

  /**
   * @deprecated  
   * 
   * Unmark all the previous activities if the
   * deleted activity was a recurrent one
   *
   * @method unmarkRecurrentActivity
   *
   * @param {Object} candidateActivityLog
   * @param {Integer} ownerMetricId
   *
   */
  async unmarkRecurrentActivity(candidateActivityLog, ownerMetricId) {
    const previousOperatings = await CandidateOperatingMetric.query()
      .where('candidate_id', candidateActivityLog.candidate_id)
      .where('created_by', ownerMetricId)
      .fetch();
    for (const operating of previousOperatings ? previousOperatings.rows : []) {
      const position = findIndex(operating.checklist, function (value) {
        return value.activityId == candidateActivityLog.activity_log_type_id
                || value.alternateActivityId == candidateActivityLog.activity_log_type_id;
      });
      if (position != -1) {
        operating.checklist[position].reference = null;
        operating.checklist[position].completed = false;
        operating.updated_by = ownerMetricId;
        await operating.save();
      }
    }
  }

  /**
   * @deprecated  
   * 
   * Returns the Candidate Metric Operation that
   * meets some requirements
   *
   * @method getMetricWithActivity
   *
   * @param {Object} candidateActivityLog
   * @param {String} status
   * @param {Integer} ownerMetricId
   *
   * @return {Object} An Operation Candidate Metric object or null
   *
   */
  async getMetricWithActivity(candidateActivityLog, status, ownerMetricId) {
    const time = moment(candidateActivityLog.created_at).format(DateFormats.SystemDefault);
    return await CandidateOperatingMetric.query()
      .where('candidate_id', candidateActivityLog.candidate_id)
      .where('created_by', ownerMetricId)
      .whereRaw(`checklist @> '[{"activityId":${candidateActivityLog.activity_log_type_id},"completed":${status}}]' OR
                  checklist @> '[{"alternateActivityId":${candidateActivityLog.activity_log_type_id},"completed":${status}}]'
      `)
      .whereRaw(
        `start_date <= '${time}'::timestamp at time zone 'utc' and  end_date > '${time}'::timestamp at time zone 'utc'`
      )
      .orderBy('start_date', 'desc')
      .first();
  }

  /**
   * @deprecated  
   * 
   * Return the candidate metrics from an user
   *
   * @method getMetricsByUser
   *
   * @param {Integer} userId
   *
   * @return {Object} CandidateMetrics data or an error code
   */
  async getMetricsByUser(userId) {
    try {
      const metrics = Database.select([
        Database.raw(
          'distinct on (cm.candidate_id) last_value(cm.start_date) over (partition by cm.candidate_id order by cm.start_date asc RANGE BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) as start_date'
        ),
        'cm.candidate_id as id',
        'cm.end_date',
        'cm.checklist',
        'pi.full_name as title',
        'pst.title as subtitle',
      ])
        .from('candidate_operating_metrics as cm')
        .innerJoin('candidates as ca', 'cm.candidate_id', 'ca.id')
        .innerJoin('blue_sheets as bsh', 'ca.id', 'bsh.candidate_id')
        .leftJoin('personal_informations as pi', 'ca.personal_information_id', 'pi.id')
        .innerJoin('specialties as spec', 'ca.specialty_id', 'spec.id')
        .innerJoin('positions as pst', 'ca.position_id', 'pst.id')
        .leftJoin('candidate_additional_recruiters as car','ca.id','car.candidate_id')
        .where(function () {
          this.where('ca.recruiter_id', userId).orWhere(
            Database.raw('car.recruiter_id = ? and type = ? and status = ?', [
              userId,
              AdditionalRecruiterTypes.Accountable,
              AdditionalRecruiterStatus.Approved,
            ])
          );
        })
        .where('cm.created_by', userId)
        .whereIn('bsh.candidate_type_id', [CandidateTypeSchemes.Alpha, CandidateTypeSchemes.Poejo])
        .orderByRaw('cm.candidate_id,cm.created_at desc');

      const data = await Database.raw(`select * from (${metrics}) as subquery order by start_date desc`);
      const result = data.rows.map((value) => ({
        ...value,
        percentage: Math.round(
          Number(((countBy(value.checklist, (val) => val.completed).true || 0) * 100) / value.checklist.length)
        ),
      }));
      return {
        success: true,
        code: 200,
        data: result,
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
      return { success: false, code: 500, message: 'There was a problem getting information' };
    }
  }

  /**
   * @deprecated  
   * 
   * Returns the operating actual from
   * a candidate
   *
   * @method getCurrentOperating
   *
   * @param {Intger} candidateId
   *
   * @return {Object} Operating Candidate Metric
   */

  async getCurrentOperating(candidateId, userId) {
    const time = moment().format(DateFormats.SystemDefault);
    return await CandidateOperatingMetric.query()
      .where('candidate_id', candidateId)
      .where('created_by',userId)
      .whereRaw(
        `start_date <= '${time}'::timestamp at time zone 'utc' and  end_date > '${time}'::timestamp at time zone 'utc'`
      )
      .orderBy('start_date', 'desc')
      .first();
  }

  /**
   * @deprecated  
   * 
   * Evaluates the operating status when the status/type
   * of the candidate changes
   *
   * @method evaluateMetricsWhenStatusChange
   *
   * @param {Object} blueSheet
   *
   */
  async evaluateMetricsWhenStatusChange(candidateId, previousCandidateTypeId = null, userId) {
    const isAnOngoingItem = await this.isAnOngoingItem(candidateId);
    const metrics = await CandidateOperatingMetric.query().where('candidate_id', candidateId).fetch();
    if ((previousCandidateTypeId && previousCandidateTypeId !== CandidateTypeSchemes.Alpha) && isAnOngoingItem) {
      Event.fire(EventTypes.Candidate.MetricsStopped, { candidateId });
      await this.initializeAllUsersMetricByCandidate(candidateId);
    } else if (isAnOngoingItem) {
      if(metrics.rows.length == 0){
        await this.initializeAllUsersMetricByCandidate(candidateId);
      }else if(!find(metrics.rows, { created_by: userId })){
        await this.initializeOperatingMetrics(candidateId, userId);
        Event.fire(EventTypes.Candidate.MetricsInitialized, { candidateId, userId });
      }
    } else if (!isAnOngoingItem) {
      Event.fire(EventTypes.Candidate.MetricsStopped, { candidateId });
    }
  }

  async initializeAllUsersMetricByCandidate(id){
    const candidate = await Candidate.query()
      .with('additionalRecruiters', (builder) => {
        builder.where('type', '=', AdditionalRecruiterTypes.Accountable)
        builder.where('status','=',AdditionalRecruiterStatus.Approved)
      })
      .where({id})
      .first();
    if(!candidate){
      return null;
    }
    const candidateJson = candidate.toJSON();
    candidateJson.additionalRecruiters.push({recruiter_id:candidateJson.recruiter_id})
    for(const additional of candidateJson.additionalRecruiters){
      await this.initializeOperatingMetrics(id, additional.recruiter_id);
      Event.fire(EventTypes.Candidate.MetricsInitialized, { candidateId: id, userId: additional.recruiter_id });
    }
  }

  /**
   * @deprecated  
   * 
   * Returns the metrics for the candidate
   *
   * @method getOperatingMetrics
   *
   * @param {Integer} candidateId
   *
   */
  async getOperatingMetrics(candidateId) {
    try {
      const operatings = await CandidateOperatingMetric.query()
        .where('candidate_id', candidateId)
        .with('recruiter', (builder) => {
          builder.setHidden([
            'avatar',
            'double_authentication',
            'step_wizard',
            'personal_information_id',
            'user_status_id',
            ...auditFields,
          ]);
          builder.with('personalInformation')
        })
        .orderBy('start_date', 'desc')
        .fetch();
      return {
        code: 200,
        data: operatings,
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
      return { success: false, code: 500, message: 'There was a problem getting the information' };
    }
  }


  /**
   * Return an array of candidates
   *
   * @param {Object[]} Candidates
   */
  async getCandidatesByIds(candidatesId) {
    const candidates = (await Candidate.query()
      .select([
        'candidates.id',
        'candidates.email',
        'pi.full_name',
        Database.raw("(select concat(cty.title,', ',st.slug)) as location"),
        'st.title as state',
        'cty.title as city',
        'spec.title as specialty',
        'sub.title as subspecialty',
      ])
      .with('employerCompanies', (builder) => builder.where('is_current_company', true))
      .innerJoin('personal_informations as pi', 'candidates.personal_information_id', 'pi.id')
      .leftJoin('addresses as add', 'pi.address_id', 'add.id')
      .leftJoin('cities as cty', 'add.city_id', 'cty.id')
      .leftJoin('states as st', 'cty.state_id', 'st.id')
      .leftJoin('specialties as spec', 'candidates.specialty_id', 'spec.id')
      .leftJoin('subspecialties as sub', 'sub.id', 'candidates.subspecialty_id')
      .whereIn('candidates.id', candidatesId)
      .fetch()).toJSON();

    return candidates;
  }

  async deleteFile(candidateId, fileId, userId) {
    try {
      const candidateFile = await CandidateHasFile.query()
        .where('id', fileId)
        .where('candidate_id', candidateId)
        .first();

      if (!candidateFile) {
        return {
          code: 404,
          success: false,
          message: 'File not found',
        };
      }

      const candidate = await Candidate.find(candidateId);
      await deleteServerFile(candidateFile.url);
      await candidateFile.delete();
      await candidate.merge({ updated_by: userId });
      await candidate.save();

      Event.fire(EventTypes.Candidate.FileDeleted, {
        candidateId: candidate.id,
        entity: EntityTypes.File,
        operation: OperationType.Delete,
        payload: candidateFile,
        userId,
      });

      return {
        code: 200,
        success: true,
        message: 'The file was deleted successfully!',
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      return {
        code: 500,
        success: false,
        message: 'There was a problem deleting the file, please try again later',
      };
    }
  }

  /**
   * Log a candidate  change
   *
   * @method logChange
   *
   * @param {integer} candidateId
   * @param {string} entity Name of the changed entity (candidate, bluesheet, note, attachment, etc.)
   * @param {string} operation Related operation (create, update, delete)
   * @param {payload} operation Content of the changed object
   *
   *
   */
  async logChange(candidateId, entity, operation, payload, userId, successful_operation) {
    try {
      await CandidateChangeLog.create({
        candidate_id: candidateId,
        entity,
        operation,
        payload,
        created_by: userId,
        successful_operation
      });
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
    }
  }

  /**
   * Log a candidate status (type) change
   *
   * @method logStatusChange
   *
   * @param {Integer} candidateId
   * @param {Integer} typeId
   * @param {Integer} userId
   *
   */
  async logStatusChange(candidateId, typeId, userId) {
    try {
      await CandidateTypeLog.create({
        candidate_id: candidateId,
        candidate_type_id: typeId,
        created_by: userId,
      });
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
    }
  }

  /**
   * Returns the request for an
   * additional recruiter
   *
   * @method createAdditionalRecruiterRequest
   *
   * @param {Integer} candidateId
   * @param {Object} requestData
   * @param {Integer} eventUserId
   *
   * @return {Object} Candidate Additional Recruiter
   */
  async createAdditionalRecruiterRequest(candidateId, requestData, currentUser) {
    //The status for this release  will be approved by default.
    try {
      let result;
      const { notes, type, target_recruiter_id, recruiter_to_collaborate_id } = requestData;

      if (target_recruiter_id && recruiter_to_collaborate_id && target_recruiter_id === recruiter_to_collaborate_id) {
        return {
          success: false,
          code: 400,
          message: 'You are assigning the same recruiter!',
        };
      }
      const candidate = await Candidate.find(candidateId);
      if (!candidate) {
        return {
          code: 404,
          success: false,
          message: 'The Candidate was not found',
        };
      }

      if((await this.isARecruiterAssigned(candidateId, target_recruiter_id))) {
        const user = await User.find(target_recruiter_id);
        return {
          code: 400,
          success: false,
          message: `Recruiter ${user ? '('+user.initials+')' : ''} already assigned. Remove that assignment first and try again.`,
        }
      }
      
      switch (type) {
        case AdditionalRecruiterTypes.Accountable:
          result = await this.canAssignAnAccountable(candidate, currentUser.id, target_recruiter_id, type);
          break;
        case AdditionalRecruiterTypes.Collaborator:
          result = await this.canAssignACollaborator(candidate, currentUser.id);
          break;
      }
      if (!result.success) {
        return result;
      }
      const isCoach = await UserRepository.hasRole(currentUser.id, userRoles.Coach);
      const recruiterToCollaborateId = recruiter_to_collaborate_id || (isCoach ? candidate.recruiter_id : currentUser.id);

      const candidateAdditionalRecruiter = await CandidateAdditionalRecruiter.create({
        recruiter_to_collaborate_id: type === AdditionalRecruiterTypes.Collaborator ? recruiterToCollaborateId : null,
        recruiter_id: target_recruiter_id,
        candidate_id: candidateId,
        notes,
        type,
        status: AdditionalRecruiterStatus.Approved,
        created_by: currentUser.id,
        updated_by: currentUser.id,
      });

      if(type === AdditionalRecruiterTypes.Accountable){
        await this.setFreeGame(candidateId, false);
      }
    
      Event.fire(EventTypes.Candidate.AdditionalRecruiterRequested, { additionalRecruiter: candidateAdditionalRecruiter, userId: currentUser.id, action: 'assign' });

      await candidateAdditionalRecruiter.loadMany({
        recruiter: (builder) =>
          builder
            .setHidden([
              'avatar',
              'double_authentication',
              'step_wizard',
              'personal_information_id',
              'user_status_id',
              ...auditFields,
            ])
            .with('personalInformation', (builder) => {
              builder.setHidden('contact_id', auditFields);
              builder.with('contact', ...auditFields);
            })
            .with('industries')
            .with('specialties'),
      });
      candidateAdditionalRecruiter.coach = await RecruiterRepository.getCoachInfoByRecruiterId(
        candidateAdditionalRecruiter.recruiter_id
      );

      return {
        success: true,
        code: 201,
        data: candidateAdditionalRecruiter,
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
      return {
        code: 500,
        success: false,
        message: 'There was a problem making the request, please try again later!',
      };
    }
  }

  /**
   * Evaluates the possibility for an user to 
   * assign a recruiter for the candidate
   *
   * @method canAssignAnAccountable
   *
   * @param {Object} candidate
   * @param {Integer} eventUserId
   * @param {Integer} target_recruiter_id
   * @param {String} type
   *
   */
  async canAssignAnAccountable(candidate, eventUserId, target_recruiter_id, type) {
    const recruiterAccountable = await this.existAdditionalRecruiter({
      candidateId: candidate.id,
      status: AdditionalRecruiterStatus.Approved,
      type
    });
    const hasOverridePermission = await UserRepository.hasPermission(eventUserId, userPermissions.inventory.overrideAssignment);
    if(hasOverridePermission && (candidate.free_game || recruiterAccountable)){
      return {
        success: true,
      };
    }

    const coachAccountable = recruiterAccountable ? await RecruiterRepository.getCoachInfoByRecruiterId(recruiterAccountable.recruiter_id) : null;    
    if (!candidate.free_game && !coachAccountable) {
      return {
        code: 400,
        success: false,
        message: 'The Candidate provided is not a free game',
      };
    }
    
    const isCoach = await UserRepository.hasRole(eventUserId, userRoles.Coach);
    if (isCoach) {
      const coach = await RecruiterRepository.getCoachInfoByRecruiterId(target_recruiter_id);
      if (!coach || coach.id != eventUserId) {
        const coachItry = await UserRepository.getIndustries(eventUserId);
        const recItry = await UserRepository.getIndustries(target_recruiter_id);
        const hasSameIndustry = intersectionBy(coachItry, recItry, 'id');
        if (hasSameIndustry.length === 0) {
          return {
            code: 400,
            success: false,
            message: "You can't assign the provided recruiter",
          };
        }
      }
    }
    
    return {
      success: true,
    };
  }


    /**
   * Evaluates the possibility for an user to 
   * assign a recruiter for the candidate
   *
   * @method canAssignACollaborator
   *
   * @param {Object} candidate
   * @param {Integer} eventUserId
   * @param {Integer} target_recruiter_id
   *
   */
  async canAssignACollaborator(candidate, eventUserId) {
    const isCoach = await UserRepository.hasRole(eventUserId, userRoles.Coach);
    const hasOverridePermission = await UserRepository.hasPermission(eventUserId, userPermissions.inventory.overrideAssignment);
      
    if (
      candidate.recruiter_id !== eventUserId &&
      !(await this.isARecruiterOnTheCandidate(candidate.id, eventUserId)) &&
      !isCoach &&
      !hasOverridePermission
    ) {
      return {
        code: 403,
        success: false,
        isInactive: false,
        redirect: false,
        message: "You don't have the permissions to perform this action",
      };
    }
    
    return {
      success: true,
    };
  }

  /**
   * Log a candidate status (type) change
   *
   * @method markCandidatesFreeGame
   *
   * This method marks the free game field on the candidates.
   * There are two cases to evaluate :
   *    1.The candidate will be set as free game if the last activiy date has more than 21 days.
   *      At the same time the candidate should be ALPHA or POEJO and doesn't have
   *      an additional accountable recruiter assigned.
   *    2.The candidate will be set as not free game if the last activity date  
   *      is less then 21 days.Also if the candidate is no longer ALPHA or POEJO or exist an accountable recruiter
   *      active.
   */
  async markCandidatesFreeGame({ candidateId, evaluateAll = false }) {
    const numberOfDays = 21;
    const whereClausItem = evaluateAll ? '' : 'WHERE ca.id = :candidateId';
    try {
      const activityDateEvalStatement = (operator) => {
        return `
          ( ca.last_activity_date IS NULL AND Date_part('day', Now() - ca.created_at) ${operator} :twentyOneDays ) 
          OR 
          ( ca.last_activity_date IS NOT NULL AND Date_part('day', Now() - ca.last_activity_date) ${operator}:twentyOneDays )
        `;
      }
      const additionalRecruiterStatement = 'SELECT id FROM candidate_additional_recruiters WHERE candidate_id = ca.id AND type = :accountable AND status = :approved';
      await Database.raw( `
        UPDATE candidates SET free_game = items.status_to_change
          FROM
          (
            SELECT ca.id,
              (CASE 
                WHEN ca.free_game = false 
                  AND( 
                      bs.candidate_type_id = :typeAlpha
                      AND ca.status_id = :statusOngoing
                      AND( ${activityDateEvalStatement('>')} )
                      AND NOT EXISTS ( ${additionalRecruiterStatement} )
                    ) 
                  THEN true
                WHEN  ca.free_game = true 
                  AND( 
                    (${activityDateEvalStatement('<')}) 
                    OR EXISTS ( ${additionalRecruiterStatement} )
                    OR bs.candidate_type_id  != :typeAlpha
                    OR ca.status_id != :statusOngoing
                  )
                  THEN false
                ELSE null
              END) status_to_change
              FROM candidates ca INNER JOIN blue_sheets as bs ON bs.candidate_id = ca.id ${whereClausItem}
         ) AS items where candidates.id = items.id
        AND items.status_to_change IS NOT null
      `,
        {
          typeAlpha :CandidateTypeSchemes.Alpha,
          statusOngoing :CandidateStatusSchemes.Ongoing,
          twentyOneDays :numberOfDays,
          accountable: AdditionalRecruiterTypes.Accountable,
          approved :AdditionalRecruiterStatus.Approved,
          candidateId
        }
      );
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
    }
  }

  /**
   * Toggle a candidate free game flag
   *
   * @method setFreeGame
   *
   * @param {Integer} candidateId
   * @param {Boolean} isFreeGame
   *
   */
  async setFreeGame(candidateId, isFreeGame) {
    try {
      await Candidate.query().where('id', candidateId).update({ free_game: isFreeGame });
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
    }
  }

  /**
   * Returns wherever the recruiter is working on the candidate
   *
   * @method isARecruiterOnTheCandidate
   *
   * @param {Integer} candidateId
   * @param {Integer} recruiterId
   * 
   * 
   *
   */ 
  async isARecruiterOnTheCandidate(candidateId, recruiterId) {
    const result = await Database.from('candidates as ca')
      .select(['ca.id'])
      .leftJoin('candidate_additional_recruiters as car', 'ca.id', 'car.candidate_id')
      .where('ca.id', candidateId)
      .where(function () {
        this.where('ca.recruiter_id', recruiterId).orWhere(
          Database.raw('car.recruiter_id = ? and car.type = ? and car.status = ?', [
            recruiterId,
            AdditionalRecruiterTypes.Accountable,
            AdditionalRecruiterStatus.Approved,
          ])
        );
      })
      .first();
    return result ? true : false;
  }

    /**
   * Returns wherever the coach is working on the candidate
   *
   * @method isACoachOnTheCandidate
   *
   * @param {Integer} candidateId
   * @param {Integer} coachId
   * 
   * 
   *
   */ 
  async isACoachOnTheCandidate(candidateId, coachId) {
    const result = await Database.from('candidates as ca')
      .select(['ca.id'])
      .joinRaw('left join candidate_additional_recruiters as car on ca.id = car.candidate_id and  car.type = ? and car.status = ?',[AdditionalRecruiterTypes.Accountable,AdditionalRecruiterStatus.Approved])
      .joinRaw('left join recruiter_has_industries as rhi on ca.recruiter_id = rhi.recruiter_id or car.recruiter_id = rhi.recruiter_id')
      .where('ca.id', candidateId)
      .where('rhi.coach_id',coachId)
      .first();
    return !!result;
  }

  /**
   * Checks if the user/recruiter passed is assigned & approved to the candidate
   *
   * @description Checks if the recruiterId is approved related to the candidate passed
   *
   * @param {Number} candidateId - The candidate the assigned is being tested against to
   * @param {Number} recruiterId - The recruiter that is being tested if he is assigned
   *
   * @return {Boolean} isAssigned
   *
   */
  async isARecruiterAssigned(candidateId, recruiterId) {
    const result = await Database.from('candidates as ca')
      .select(['ca.id'])
      .leftJoin('candidate_additional_recruiters as car', 'ca.id', 'car.candidate_id')
      .where('ca.id', candidateId)
      .where(function () {
        this.where('ca.recruiter_id', recruiterId).orWhere(
          Database.raw('car.recruiter_id = ? and car.status = ?', [
            recruiterId,
            AdditionalRecruiterStatus.Approved,
          ])
        );
      })
      .first();
      
    return !!result;
  }


    /**
   * Returns the info of the additional recruiters
   *
   * @method getAdditionalRecruitersInfo
   *
   * @param {Integer} candidateId
   * @param {String} status
   */
  async getAdditionalRecruitersInfo(candidateId,status){
    try {
      const approvedRecruiters = await CandidateAdditionalRecruiter.query()
        .where('candidate_id', candidateId)
        .where('status', status)
        .with('recruiter', (builder) => {
            builder
              .setHidden([
                'avatar',
                'double_authentication',
                'step_wizard',
                'personal_information_id',
                'user_status_id',
                ...auditFields,
              ])
              .with('personalInformation', (builder) => {
                builder.setHidden('contact_id', auditFields);
                builder.with('contact', ...auditFields);
              })
              .with('industries')
              .with('specialties');
        })
        .fetch();
      for (const additionalRecruiter of approvedRecruiters.rows) {
        additionalRecruiter.coach = await RecruiterRepository.getCoachInfoByRecruiterId(additionalRecruiter.recruiter_id);
      }
      return {
        code:200,
        success:true,
        data:approvedRecruiters
      }
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
      return {
        code: 500,
        success: false,
        message: 'There was a problem getting the info, please try again later!',
      };
    }
  }

    /**
   * Returns the first element of recruiter additional
   *
   * @method existAdditionalRecruiter
   *
   * @param {Integer} candidateId
   * @param {Integer} recruiterId
   * @param {Integer} recruiterToCollaborateId
   * @param {String} type
   * @param {String} status
   */
  async existAdditionalRecruiter({candidateId, recruiterId, recruiterToCollaborateId, type, status}){
    const recruiterAccountableQuery =  CandidateAdditionalRecruiter.query();
      recruiterAccountableQuery.where('candidate_id', candidateId)
      type ? recruiterAccountableQuery.where('type', type) : null;
      recruiterId ? recruiterAccountableQuery.where('recruiter_id',recruiterId) : null;
      recruiterToCollaborateId ? recruiterAccountableQuery.where('recruiter_to_collaborate_id',recruiterToCollaborateId) : null ;
      status ? recruiterAccountableQuery.where('status',AdditionalRecruiterStatus.Approved) : null;
    return await recruiterAccountableQuery.first();
  }

  /**
   * Deletes an additional recruiter of a candidate
   * 
   * @method deleteAdditionalRecruiter
   *
   * @param {Integer} recruiterRequestId The id of the addition recruiter request
   * @param {Integer} candidateId
   * @param {Integer} userId
   *
   * @return {Object} A success with a code 200  or an error code
   *
   */
  async deleteAdditionalRecruiter(recruiterRequestId, candidateId, userId) {
    try {
      const additionalRecruiter = await CandidateAdditionalRecruiter.find(recruiterRequestId);

      const canDeleteResult = await this.canEditAdditionalRecruiter(additionalRecruiter, candidateId, userId);
      if(!canDeleteResult.success)  {
        return canDeleteResult;
      }
      
      await additionalRecruiter.delete();

      if(additionalRecruiter.type === AdditionalRecruiterTypes.Accountable){
        await this.markCandidatesFreeGame({ candidateId: Number(candidateId) });
      }

      Event.fire(EventTypes.Candidate.AdditionalRecruiterRemoved, {
        additionalRecruiter,
        userId,
        action: 'remove'
      });
      return {
        success: true,
        code: 200,
        message: 'The additional recruiter was removed from this candidate!',
      };
    } catch (error) {   
      appInsights.defaultClient.trackException({ exception: error });

      return {
        success: false,
        code: 500,
        message: 'There was a problem removing the additional recruiter',
      };
    }
  }
  /**
   * Updates an additional recruiter of a candidate
   * 
   * @method updateAdditionalRecruiter
   *
   * @param {Integer} recruiterRequestId
   * @param {Integer} candidateId
   * @param {Integer} userId
   *
   * @return {Object} A success with a code 200  or an error code
   *
   */
  async updateAdditionalRecruiter(recruiterRequestId, candidateId, payload, userId) {
    try {
      const { target_recruiter_id: recruiter_id, recruiter_to_collaborate_id } = payload;
      const additionalRecruiter = await CandidateAdditionalRecruiter.find(recruiterRequestId);

      const canEditResult = await this.canEditAdditionalRecruiter(additionalRecruiter, candidateId, userId);
      if (!canEditResult.success) {
        return canEditResult;
      }
      if ((await this.isARecruiterAssigned(candidateId, recruiter_id))) {
        const user = await User.find(recruiter_id);
        return {
          code: 400,
          success: false,
          message: `Recruiter ${user ? '('+user.initials+')' : ''} already assigned. Remove that assignment first and try again.`,
        }
      }

      await additionalRecruiter.merge({ recruiter_id, recruiter_to_collaborate_id, updated_by: userId });
      await additionalRecruiter.save();

      Event.fire(EventTypes.Candidate.AdditionalRecruiterUpdated, {
        additionalRecruiter,
        userId,
        action: 'assign'
      });

      return {
        success: true,
        code: 200,
        message: 'The additional recruiter was updated successfully!',
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      return {
        success: false,
        code: 500,
        message: 'There was a problem updating the additional recruiter',
      };
    }
  }

  async canEditAdditionalRecruiter(additionalRecruiter = {}, candidateId, userId) {
    try {
      const { candidate_id, recruiter_id: additionalUserId = null, created_by: accountableUserId = null } = additionalRecruiter;
      if (!additionalUserId) {
        return {
          code: 404,
          message: Antl.formatMessage('messages.error.notFound', { entity: 'additional recruiter' })
        };
      }

      if (candidate_id != candidateId) {
        return {
          code: 404,
          message: Antl.formatMessage('messages.error.notFound', { entity: 'candidate' })
        };
      }

      const { coach_id, regional_director_id } =  await UserRepository.getCoachAndRegionalDirector(additionalUserId);
      const hasOverridePermission = await UserRepository.hasPermission(userId, userPermissions.inventory.overrideAssignment);
      if (!hasOverridePermission && userId != accountableUserId && userId != coach_id &&  userId != regional_director_id) {
        return {
          code: 403,
          message: Antl.formatMessage('messages.error.authorization')
        };
      }

      return {
        success: true,
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      return {
        success: false,
        code: 500,
        message: Antl.formatMessage('messages.error.internalServer', { action: 'removing', entity: 'adittional recruiter' }),
      };
    }
  }

  async logAssignment(additionalRecruiter, action, userId) {
    try {
      const {candidate_id, recruiter_id, type, recruiter_to_collaborate_id} = additionalRecruiter;
      await CandidateRecruiterAssignment.create({
        candidate_id,
        recruiter_id,
        coach_id: userId,
        another_recruiter_id: recruiter_to_collaborate_id,
        type,
        action,
      });
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
    }
  }

  async changeOwnershipItems(oldUserId, newUserId, userLogId, extTransaction){
    let trx;
    const logsData = [];
    const date =  moment().format(DateFormats.SystemDefault);
    try {
      trx = extTransaction || (await Database.beginTransaction());

      const {  caIds = [] }= await this.updateOwnerUrgentItems(oldUserId, newUserId, date, userLogId, trx);
      const {  caIdsFreeGame = [] } = await this.updateOwnerFreeGameItems(oldUserId, newUserId, date, userLogId, trx);

      //Log Info
      for(const caId of [...caIds,...caIdsFreeGame]){
        const _type = caIds.includes(caId) ? 'main' : AdditionalRecruiterTypes.Accountable;
        logsData.push({       
          candidate_id: caId,
          recruiter_id: newUserId,
          coach_id: userLogId,
          type: _type,
          created_at: date,
          updated_at: date
        });
      }
      //Insert Logs
      await trx.insert(logsData).into('candidate_recruiter_assignments');

      if(!extTransaction){
        await trx.commit();
        return {
          success: true
        };
      }
      return { success: true, wereItemsMoved: logsData.length > 0, ids: [...caIds,...caIdsFreeGame] };
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
    const caIds = await trx
      .table('candidates as ca')
      .where('ca.recruiter_id', oldUserId)
      .whereNotExists((builder) => {
        builder.select('id')
          .from('candidate_additional_recruiters as cadr')
          .whereRaw(
            `
            ca.id = cadr.candidate_id AND 
            cadr.recruiter_id = :newUserId  AND
            cadr.type = :accountable
            `,
            { newUserId, accountable: AdditionalRecruiterTypes.Accountable }
          );
      })
      .update({ recruiter_id: newUserId, updated_at: date, updated_by: userLogId })
      .returning('ca.id');

    await trx
      .table('candidate_additional_recruiters as cadr')
      .where('cadr.recruiter_to_collaborate_id', oldUserId)
      .whereIn('cadr.candidate_id', caIds)
      .update({ recruiter_to_collaborate_id: newUserId, updated_at: date, updated_by: userLogId });

    await trx
      .table('candidate_additional_recruiters as cadr')
      .where('cadr.type', AdditionalRecruiterTypes.Collaborator)
      .where('cadr.recruiter_id', oldUserId)
      .delete();

    return { 
      caIds 
    };
  }

  async updateOwnerFreeGameItems(oldUserId, newUserId, date, userLogId, trx){
    const caIdsFreeGame = await trx
      .table('candidate_additional_recruiters as cadr')
      .where('cadr.type', AdditionalRecruiterTypes.Accountable)
      .where('cadr.recruiter_id', oldUserId)
      .whereNotExists((builder) => {
        builder.select('id')
          .from('candidates as ca')
          .whereRaw('ca.id = cadr.candidate_id AND ca.recruiter_id = :newUserId', { newUserId });
      })
      .update({ recruiter_id: newUserId, updated_at: date, updated_by: userLogId })
      .returning('cadr.candidate_id');

    await trx
      .table('candidate_additional_recruiters as cadr')
      .where('cadr.recruiter_to_collaborate_id', oldUserId)
      .whereIn('cadr.candidate_id', caIdsFreeGame)
      .update({ recruiter_to_collaborate_id: newUserId, updated_at: date, updated_by: userLogId });

    return { 
      caIdsFreeGame
    };
  }

  
  async updateStatus(id, statusId, trx = null){
    const candidate = await Candidate.find(id);
    if (!candidate) {
      return;
    }
    candidate.merge({ status_id: statusId });
    await candidate.save(trx);
  }

  async updateType(id, typeId, trx = null){
    const bluesheet = await BlueSheetRepository.getByCandidate(id);
    if (!bluesheet) {
      return;
    }
    bluesheet.merge({ candidate_type_id: typeId });
    await bluesheet.save(trx);
  }

  /**
   * Evaluates if the candidate is an ongoing Alpha
   *
   * @method isAnOngoingItem
   *
   * @param {Integer} candidateId
   *
   * @return {Boolean}
   */
   async isAnOngoingItem(candidateId) {
    const candidate = await Candidate.find(candidateId);
    const { status_id = null } = candidate;
    const blueSheet = await BlueSheetRepository.getByCandidate(candidateId);
    const { candidate_type_id = null } = blueSheet ;
    return candidate_type_id == CandidateTypeSchemes.Alpha && status_id == CandidateStatusSchemes.Ongoing;
  }

    /**
   * Returns placements from a candidate
   *
   * @method placements
   *
   * @param {Integer} id
   *
   * @return {Object} Placements
   */
  async placements(id) {
    try {
      const placementsList = await PlacementRepository.getPreviews({ candidate_id: id });
      return {
        code: 200,
        data: placementsList
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      return {
        success: false,
        code: 500,
        message: Antl.formatMessage('messages.error.internalServer', { action: 'getting', entity: 'placements' }),
      };
    }
  }

  async getLogs(candidateId, entity) {
    try {
      const query = CandidateChangeLog.query()
        .hideFields({
          hideAuditFields: false,
          fields: ['payload'],
        })
        .include([
          {
            relation: 'user',
            hideFields: { fields: [...userFields, 'job_title'] },
            load: [
              {
                relation: 'personalInformation',
                extend: [
                  {
                    method: 'select',
                    params: ['id', 'full_name'],
                  },
                ],
              },
            ],
          },
        ])
        .where('candidate_id', candidateId)
        .where('successful_operation', true);

      if (entity) {
        query.where('entity', entity);
      }
      const logs = await query.orderBy('created_at', 'desc').fetch();

      return {
        success: true,
        code: 200,
        data: logs,
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      return {
        success: false,
        code: 500,
        message: Antl.formatMessage('messages.error.internalServer', { action: 'getting', entity: 'logs' }),
      };
    }
  }

  async updateReferenceSentDate(candidateId, date){
    await Database.table('candidates')
      .where('id',candidateId)
      .update({last_sent_reference_date : date});
  }

  /**
   *
   * @param {Integer} candidateId
   * @returns basic info to sendout
   */
  async getCandidateForSendout(candidateId) {
    const result = await Database.table('candidates as ca')
    .select(['ca.id', 'pi.full_name', 'i.email as industry_email'])
    .innerJoin('personal_informations as pi', 'ca.personal_information_id', 'pi.id')
    .innerJoin('specialties as s2', 'ca.specialty_id', 's2.id')
    .innerJoin('industries as i', 's2.industry_id', 'i.id')
    .where('ca.id', candidateId)
    .first();
    return result;
  }
}

module.exports = CandidateRepository;
