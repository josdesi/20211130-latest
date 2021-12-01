'use strict';

//Repositories
const RecruiterRepository = new (require("./RecruiterRepository"))();
const WhiteSheetRepository = new (use('App/Helpers/WhiteSheetRepository'))();
const HiringAuthorityRepository = new (use('App/Helpers/HiringAuthorityRepository'))();
const UserRepository = new (use('App/Helpers/UserRepository'))();
const LocationRepository = new (use('App/Helpers/LocationRepository'))();
const CompanyRepository = new (use('App/Helpers/CompanyRepository'))();
const PlacementRepository = new (use('App/Helpers/PlacementRepository'))();

//Utils
const appInsights = require("applicationinsights");
const Helpers = use('Helpers');
const Database = use('Database');
const {
  userFields,
  auditFields,
  hiringAuthorityStatus,
  JobOrderTypeSchemes,
  JobOrderStatusSchemes,
  EntityTypes,
  DateFormats,
  OperationType,
  AdditionalRecruiterStatus,
  AdditionalRecruiterTypes,
  userRoles,
  userPermissions
} = use('App/Helpers/Globals');
const { moveFile } = use('App/Helpers/FileHelper');
const { fileType } = use('App/Helpers/FileType');
const { batchInsert } = use('App/Helpers/QueryUtils');

const { remove, findIndex ,countBy,filter ,intersectionBy, find } = use('lodash');
const Event = use('Event');
const EventTypes = use('App/Helpers/Events');
const humanInterval = use('human-interval');
const moment = use('moment');
const Antl = use('Antl');


//Models
const JobOrder = use('App/Models/JobOrder');
const Company = use('App/Models/Company');
const Address = use('App/Models/Address');
const JobOrderHasFile = use('App/Models/JobOrderHasFile');
const JobOrderNote = use('App/Models/JobOrderNote');
const JobOrderActivityLog = use('App/Models/JobOrderActivityLog');
const City = use('App/Models/City')
const JobOrderHasHiringAuthority = use('App/Models/JobOrderHasHiringAuthority')
const HiringAuthority = use('App/Models/HiringAuthority');
const User = use('App/Models/User');
const JobOrderHasCandidate = use('App/Models/JobOrderHasCandidate');
const Candidate = use('App/Models/Candidate');
const JobOrderRecruiterAssignment = use('App/Models/JobOrderRecruiterAssignment');
const OperatingMetricConfiguration = use('App/Models/OperatingMetricConfiguration');
const JobOrderOperatingMetric = use('App/Models/JobOrderOperatingMetric');
const JobOrderTypeLog = use('App/Models/JobOrderTypeLog');
const JobOrderChangeLog = use('App/Models/JobOrderChangeLog');
const JobOrderAdditionalRecruiter = use('App/Models/JobOrderAdditionalRecruiter');

const userBuilder = (builder) => {
  builder.setHidden(['personal_information_id', 'user_id', 'email_signature', ...auditFields]);
  builder.with('personalInformation', (builder) => {
    builder.setHidden(['contact_id', 'address_id', 'birthdate', ...auditFields]);
    builder.with('contact', (builder) => {
      builder.setHidden([...auditFields]);
    });
  });
};

class JobOrderRepository {
  async create(req,user_id) {
    // job order
    const {
      company_id,
      position_id,
      title,
      open_since,
      start_date,
      source,
      different_location,
      hiring_authority_id,
      whiteSheet,
      specialty_id,
      subspecialty_id,
      job_order_source_type_id
    } = req;

    // transaction
    let trx;

    try {
      let address_id;
      const company = await Company.findOrFail(company_id);
      const addressData = {};
      if (!different_location) {
        addressData.zip = company.zip;
        addressData.city_id = company.city_id;
        addressData.coordinates = (company.coordinates && company.coordinates.x && company.coordinates.y) ? `(${company.coordinates.x},${company.coordinates.y})` : null;
        addressData.address = company.address;
      } else {
        // create address
        const { zip, city_id } = req;
        const zipCode = await LocationRepository.existZipOnCity(zip, city_id);
        if (!zipCode) {
          return {
            success:false,
            code:400,
            message:"The zip code doesn't exist in the selected city"
          }
        }
        const { latitude ,longitude } = zipCode;
        const city  = await City.find(city_id);
        addressData.zip = zip;
        addressData.city_id = city_id;
        addressData.coordinates = `(${longitude},${latitude})`;
        addressData.address = city.title;
      }
      trx = await Database.beginTransaction();
      const address = await Address.create(addressData, trx);
      address_id = address.id;

      let { recruiter_id } = req
      const res = await RecruiterRepository.canAssign(recruiter_id,user_id)
      if(res.success){
        recruiter_id = res.data
      }else{
        trx && (await trx.rollback());
        return res
      }
      const job_order = await JobOrder.create(
        {
          company_id,
          position_id,
          title,
          open_since,
          start_date,
          source,
          hot_item: 1,
          hot_item_date: new Date(),
          different_location,
          address_id,
          status_id: whiteSheet.status_id || JobOrderStatusSchemes.Ongoing,
          created_by: user_id,
          updated_by: user_id,
          recruiter_id,
          specialty_id,
          subspecialty_id,
          job_order_source_type_id
        },
        trx
      );

      await JobOrderRecruiterAssignment.create(
        { job_order_id: job_order.id, recruiter_id: job_order.recruiter_id, coach_id: user_id },
        trx
      );
      
      //HiringAuthority
      await JobOrderHasHiringAuthority.create({
        job_order_id: job_order.id,
        hiring_authority_id
      },trx)
      const { success } = await HiringAuthorityRepository.update(hiring_authority_id, {hiring_authority_status_id: hiringAuthorityStatus.Active}, trx);
      if (!success) {
        throw new Error('There was an error updating hiring authority status');
      }
      // White sheet
      const white_sheet = await WhiteSheetRepository.create(whiteSheet, job_order.id, user_id, trx);
      if (!white_sheet.success) {
        trx && (await trx.rollback());
        return white_sheet;
      }

      //Store JobOrderFiles
      const { files } = req;
      if (files) {
        for (const fileId of files) {
          const fileTemp = await Database.table('user_has_temp_files')
            .where('id', fileId)
            .where('user_id', user_id) 
            .first();
          if (!fileTemp) continue;
          const fileUrl = await moveFile(fileTemp.file_name, 'attachments/' + fileTemp.file_name);
          await Database.table('user_has_temp_files')
            .where('id', fileId)
            .where('user_id', user_id) 
            .del();
          await JobOrderHasFile.create(
            {
              job_order_id: job_order.id,
              file_type_id: await fileType('ATTACHMENT'),
              url: fileUrl,
              file_name: fileTemp.original_name
            },
            trx
          );
        }
      }

      //create transaction
      await trx.commit();
      Event.fire(EventTypes.JobOrder.Created, { jobOrder: job_order, whiteSheet: white_sheet.data, userId: user_id });

      const jobOrderJson = job_order.toJSON();
      return {
        success: true,
        message: 'Job order created successfull',
        code: 201,
        data: jobOrderJson
      };
    } catch (err) {
      appInsights.defaultClient.trackException({exception: err});
      
      // create rollback and close transaction
      trx && (await trx.rollback());
      
      return {
        success: false,
        code: 500,
        message: 'There was a problem creating the job order, please try again later' 
      };
    }
  }

  async update(params, request, userId){
    const jobOrder = await JobOrder.find(params.id);
    if (!jobOrder) {
      return {
        success:false,
        code:404,
        message: 'JobOrder not Found'
      };
    }

    // job order
    const {
      company_id,
      position_id,
      title,
      open_since,
      start_date,
      source,
      different_location,
      specialty_id,
      subspecialty_id,
      job_order_source_type_id
    } = request;

    // transaction
    const trx = await Database.beginTransaction();

    try {
      if (different_location) {
        //update address
        const { zip, city_id } = request;
        const zipCode = await LocationRepository.existZipOnCity(zip, city_id);
        if (!zipCode) {
          trx && (await trx.rollback());
          return {
            success:false,
            code:400,
            message:"The zip code doesn't exist in the selected city"
          }
        }
        const { latitude ,longitude   } = zipCode
        const  city  = await City.find(city_id)

        const address = await Address.findOrFail(jobOrder.address_id);
        await address.merge({ zip, city_id, coordinates :`(${longitude},${latitude})`, address:city.title  });
        await address.save(trx);
      }

      await jobOrder.merge({
        company_id,
        position_id,
        title,
        open_since,
        start_date,
        source,
        different_location,
        updated_by:userId,
        specialty_id,
        subspecialty_id,
        job_order_source_type_id
      });
      await jobOrder.save(trx);

      await trx.commit();

      const updatedJobOrder = await this.details(params.id);

      Event.fire(EventTypes.JobOrder.Updated, {
        jobOrderId: jobOrder.id,
        entity: EntityTypes.JobOrder,
        operation: OperationType.Update,
        payload: updatedJobOrder,
        userId,
      });

      return {
        success:true,
        code:201,
        data : updatedJobOrder
      }
    } catch (error) {
      appInsights.defaultClient.trackException({exception: error});
      trx && (await trx.rollback());
      return {
        success:false,
        code:500,
        message: 'There was a problem updating the JobOrder, please try again later' 
      };
    }
  }

  async details(id, mode = 'all') {
    const query = JobOrder.query()
      .where({ id })
      .setHidden([
        'hiring_authority_id',
        'company_id',
        'industry_id',
        'specialty_id',
        'subspecialty_id',
        'position_id',
        'address_id',
        'status_id',
        'sub_status_id'
      ])
      .with('recruiter', userBuilder)
      .with('createdBy', userBuilder)
      .with('additionalRecruiters', (builder) => {
        builder.where('status', '!=', AdditionalRecruiterStatus.Inactive);
        builder.with('recruiter', userBuilder);
        builder.orderBy('created_at', 'desc');
      });

    if (mode === 'compact' || mode === 'all') {
      query
        .with('position', (builder) => {
          builder.setHidden(['industry_id', ...auditFields]);
        })
        .with('specialty', (builder) => {
          builder.setHidden(['industry_id', ...auditFields]);
          builder.with('industry', (builder) => {
            builder.setHidden(auditFields);
          });
        })
        .with('subspecialty', (builder) => {
          builder.select(['id', 'title']);
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
        .with('status', (builder) => {
          builder.select(['id', 'title', 'style', 'style as color']);
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

          builder.with('jobOrderAccountableDig', builder => {});
          builder.with('candidateAccountableDig', builder => {});

          builder.with('candidateAccountable', builder => {
            builder.setHidden([...userFields, ...auditFields, 'job_title']);
            builder.with('personalInformation', builder => {
              builder.select(['id', 'full_name']);
            });
          })
        })
        .with('whiteSheet', (builder) => {
          builder.setHidden(['job_order_id', ...auditFields]);
          builder.with('companyFeeAgreement', (builder) => {
            builder.select(['id', 'fee_percentage', 'guarantee_days', 'flat_fee_amount', 'fee_agreement_payment_scheme_id'])
          });
          builder.with('companyFeeAgreement.feeAgreementStatus', (builder) =>   {
            builder.select(['id', 'internal_name'])
          })
          builder.with('companyFeeAgreement.feeAgreementStatus.group', (builder) =>   {
            builder.select(['id', 'title', 'style_class_name'])
          });
          builder.with('jobOrderType', (builder) => {
            builder.select(['id', 'title', 'style_class_name', 'style_class_name as color']);
          });
          builder.with('workTypeOption', (builder) => {
            builder.select(['title', 'id']);
          });
        })
        .with('sourceType', (builder) => {
          builder.setHidden([...auditFields]);
        });
    }

    if (mode === 'all') {
      this.withAllListings(query);
    }
    const jobOrder = await query.first();
    if (!jobOrder) {
      return null;
    }
    const jobOrderJson = jobOrder.toJSON();
    const coach = await RecruiterRepository.getCoachInfoByRecruiterId(jobOrder.recruiter_id);

    if(jobOrderJson.recruiter){
      const isOffice = await UserRepository.isOfficeUser(jobOrder.recruiter_id);
      jobOrderJson.recruiter.isOffice = isOffice;
    }

    for (const additionalRecruiter of jobOrderJson.additionalRecruiters) {
      additionalRecruiter.coach = await RecruiterRepository.getCoachInfoByRecruiterId(additionalRecruiter.recruiter_id);
      additionalRecruiter.isOffice = await UserRepository.isOfficeUser(additionalRecruiter.recruiter_id);
    }

    const company = await CompanyRepository.details(jobOrder.company_id, false);
    return {
      ...jobOrderJson,
      coach: coach || null,
      company
    };
  }

  async withAllListings(query) {
    query
      .with('files', builder => {
        builder.setHidden(['file_type_id', 'candidate_id']);
        builder.with('fileType', builder => {
          builder.setHidden(auditFields);
        });
      })
      .with('notes', builder => {
        builder.setHidden(['candidate_id', 'user_id']);
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
        builder.setHidden(['candidate_id', 'user_id']);
        builder.orderBy('created_at','desc')
        builder.with('activityLogType',builder=>{
          builder.setHidden(auditFields)
        })
        builder.with('bulkReference', (builder) => {
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
      })
      .with('candidates',builder=>{
        builder.setHidden([
          'personal_information_id',
          'industry_id',
          'position_id',
          'status_id',
          'recruiter_id',
          'hot_item_date',
          'current_company',
          'source_type_id',
          'specialty_id',
          'subspecialty_id',
          'migration_record',
          'migration_record_changed',
          'last_activity_date',
          'stand_by_date',
          'inactive_date',
          'activityStatus',
          'recruiter_id',
          ...auditFields]);
        builder.with('recruiter', builder => {
          builder.setHidden([
            'personal_information_id',
            'user_id',
            'double_authentication',
            'step_wizard',
            'user_status_id',
            ...auditFields]);
        })
        builder.with('personalInformation', (builder) => {
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
        builder.with('position', (builder) => {
          builder.setHidden(['industry_id', ...auditFields]);
        })
        builder.with('specialty', (builder) => {
          builder.setHidden(['industry_id', ...auditFields]);
          builder.with('industry', (builder) => {
            builder.setHidden(auditFields);
          })
        })
        builder.with('subspecialty', (builder) => {
          builder.setHidden(auditFields);
        })
        builder.with('blueSheets', (builder) => {
          builder.setHidden([
            'candidate_id',
            'reason_leaving',
            'relocation',
            'achievement_one',
            'achievement_two',
            'achievement_three',
            'experience',
            'time_looking',
            'time_to_start',
            'notes',
            'time_start_type_id',
            'candidate_type_id',
            'interview_dates',
            ...auditFields]);
        })
      });
  }

  async createNote(req,jobOrderId,user_id){
    const { body,title } = req
    const jobOrder = await JobOrder.find(jobOrderId)
    if(!jobOrder){
      return {
        success: false,
        code: 404,
        message: 'jobOrder not found' 
      };
    }
    try {
      const jobOrderNote = await JobOrderNote.create({
        body,
        title,
        user_id,
        job_order_id : jobOrderId
      })
      await jobOrderNote.load('user',builder=>{
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
        data: jobOrderNote
      };
    } catch (error) {
      appInsights.defaultClient.trackException({exception: error});

      return {
        success: false,
        code: 500,
        message: 'There was a problem creating the JobOrder note, please try again later' 
      };
    }
    
  }

  async updateNote(req,noteId,jobOrderId,userId){
    const { body,title } = req; 
    const jobOrderNote = await JobOrderNote.query()
      .where('id', noteId)
      .where('job_order_id', jobOrderId)
      .first();
    if (!jobOrderNote) {
      return {
        success: false,
        code: 404,
        message: 'Note not found' 
      };
    }
    if(jobOrderNote.user_id!=userId){
      return {
        success: false,
        code: 403,
        isInactive:false,
        redirect:false,
        message: "You don't have the permission required to use the resource",
      };
    }
    try {
      await jobOrderNote.merge({body,title});
      await jobOrderNote.save();

      Event.fire(EventTypes.JobOrder.NoteUpdated, {
        jobOrderId,
        entity: EntityTypes.Note,
        operation: OperationType.Update,
        payload: jobOrderNote,
        userId,
      });

      await jobOrderNote.load('user',builder=>{
        builder.setHidden([
          'personal_information_id',
          'user_id',
          'double_authentication',
          'step_wizard',
          'user_status_id',
          ...auditFields]);
      });
      return {
        success: true,
        code: 201,
        data: jobOrderNote
      };
    } catch (error) {
      appInsights.defaultClient.trackException({exception: error});

      return {
        success: false,
        code: 500,
        message: 'There was a problem updating the JobOrder note, please try again later' 
      };
    }
  }

  
  async deleteNote(noteId, jobOrderId,userId) {
    const jobOrderNote = await JobOrderNote.query()
      .where('id', noteId)
      .where('job_order_id', jobOrderId)
      .first();
    if (!jobOrderNote) {
      return {
        success: false,
        code: 404,
        message: 'Note not found' 
      };
    }
    if(jobOrderNote.user_id!=userId){
      return {
        success: false,
        code: 403,
        isInactive:false,
        redirect:false,
        message: "You don't have the permission required to use the resource",
      };
    }
    try {
      await jobOrderNote.delete();

      Event.fire(EventTypes.JobOrder.NoteDeleted, {
        jobOrderId,
        entity: EntityTypes.Note,
        operation: OperationType.Delete,
        payload: jobOrderNote,
        userId,
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
        message: 'There was a problem deleting the JobOrder note, please try again later'
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
   * @param {Number} activityData[].job_order_id - The activity job order
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
        const activitiesCreated = await batchInsert(JobOrderActivityLog, activityDataWithRecruiter, trx);
  
        const jobOrderIds = activityData.map(({ job_order_id }) => job_order_id);
        await JobOrder.query().transacting(trx).whereIn('id', jobOrderIds).update({ last_activity_date: 'now()' });
  
        if (!externalTrx) await trx.commit();
  
        Event.fire(EventTypes.JobOrder.BatchActivityCreated, { jobOrderIds });
  
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
            entity: 'batch job order activities',
          }),
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
   * @param {Integer} activity_log_type_id
   * @param {Integer} jobOrderId
   * @param {Integer} userId
   * @param {Object} optionalParams - An object that contains optional/extra params, trying not to put too many unnecessaries params
   *
   * @return {Object} A success with a code 201 and the activity  or an error code
   *
   */
  async createActivityLog(body, activity_log_type_id, jobOrderId, user_id, optionalParams = {}) {
    const jobOrder = await JobOrder.find(jobOrderId);

    if (!jobOrder) {
      return {
        success: false,
        code: 404,
        message: 'JobOrder not found'
      };
    }
    const {
      metadata = {},
      createdBySystem = false,
      externalTrx = null,
    } = optionalParams
    let trx;

    try {
      trx = externalTrx ? externalTrx : await Database.beginTransaction();

      const jobOrderActivityLog = await JobOrderActivityLog.create({
        body,
        user_id,
        activity_log_type_id,
        job_order_id: jobOrderId,
        created_by_system: createdBySystem,
        metadata,
      }, trx);

      if(!externalTrx) {
        await trx.commit();
      }

      await this.updateActivityDate(jobOrder, { useNowAsDate: true });

      await jobOrderActivityLog.loadMany({
        'activityLogType': (builder) =>  builder.setHidden(auditFields),
        bulkReference: (builder) => builder.setHidden(auditFields),
        'user':  (builder) =>
          builder.setHidden([
            'personal_information_id',
            'user_id',
            'double_authentication',
            'step_wizard',
            'user_status_id',
            ...auditFields])
      });

      if (!Helpers.isAceCommand()) {
        await this.markJobOrdersFreeGame({ jobOrderId });
      };


      Event.fire(EventTypes.JobOrder.ActivityCreated, { jobOrderId });

      return {
        success: true,
        code: 201,
        data: jobOrderActivityLog
      };
    } catch (error) {
      if(!externalTrx && trx) {
        await trx.rollback()
      }

      appInsights.defaultClient.trackException({exception: error});

      return {
        success: false,
        code: 500,
        message: 'There was a problem creating the JobOrder activity, please try again later' 
      };
    }
  }

  async updateActivityLog(req, activityLogId, jobOrderId,userId) {
    const {  body } = req; 
    const jobOrderActivityLog = await JobOrderActivityLog.query()
      .where('id', activityLogId)
      .where('job_order_id', jobOrderId)
      .first();
    if (!jobOrderActivityLog) {
      return {
        success: false,
        code: 404,
        message: 'JobOrder not found' 
      };
    }
    if(jobOrderActivityLog.user_id!=userId){
      return {
        success: false,
        code: 403,
        isInactive:false,
        redirect:false,
        message: "You don't have the permission required to use the resource",
      };
    }
    if (jobOrderActivityLog.created_by_system) {
      return {
        success: false,
        code: 409,
        message: Antl.formatMessage('messages.error.activityFromSystem'),
      };
    }
    try {
      await jobOrderActivityLog.merge({body});
      await jobOrderActivityLog.save();


      Event.fire(EventTypes.JobOrder.ActivityUpdated, {
        jobOrderId,
        entity: EntityTypes.Activity,
        operation: OperationType.Update,
        payload: jobOrderActivityLog,
        userId,
      });

      await jobOrderActivityLog.loadMany({
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
      return {
        success: true,
        code: 201,
        data: jobOrderActivityLog
      };
    } catch (error) {
      appInsights.defaultClient.trackException({exception: error});

      return {
        success: false,
        code: 500,
        message: 'There was a problem updating the JobOrder activity, please try again later' 
      };
    }
  }

  async deleteActivityLog(activityLogId, jobOrderId, userId) {
    const jobOrderActivityLog = await JobOrderActivityLog.query()
      .where('id', activityLogId)
      .where('job_order_id', jobOrderId)
      .first();
    if (!jobOrderActivityLog) {
      return {
        success: false,
        code: 404,
        message: 'ActivityLog not found'
      };
    }
    if(jobOrderActivityLog.user_id!=userId){
      return {
        success: false,
        code: 403,
        isInactive:false,
        redirect:false,
        message: "You don't have the permission required to use the resource",
      };
    }
    if (jobOrderActivityLog.created_by_system) {
      return {
        success: false,
        code: 409,
        message: Antl.formatMessage('messages.error.activityFromSystem'),
      };
    }
    try {
      await jobOrderActivityLog.delete();

      Event.fire(EventTypes.JobOrder.ActivityDeleted, {
        jobOrderId,
        entity: EntityTypes.Activity,
        operation: OperationType.Delete,
        payload: jobOrderActivityLog,
        userId,
      });

      if (!Helpers.isAceCommand()) {
        await this.updateActivityDate(await JobOrder.find(jobOrderId));
        await this.markJobOrdersFreeGame({ jobOrderId });
      } 

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
        message: 'There was a problem deleting the jobOrder activity, please try again later'
      };
    }
  }

  /**
   * Updates the last activity date for a job order
   *
   * @method updateActivityDate
   *
   * @param {Database} jobOrder - The database object
   * @param {Date} useNowAsDate - Allows the method to use now as last activity date, expected to be used when an insert/update will result in the last activity date to be technically a now(), but a few ms apart, improving performance
   */
  async updateActivityDate(jobOrder, { useNowAsDate = false } = {}) {
    const last_activity_date = useNowAsDate ? 'now()' : (await this.getLastActivityDate(jobOrder.id));

    await jobOrder.merge({ last_activity_date });
    await jobOrder.save();
  }

  async getLastActivityDate(jobOrderId){
    const result = await JobOrderActivityLog.query()
      .where('job_order_id', jobOrderId)
      .max('created_at');
    return result.length > 0 ? result[0].max : null;
  }

  async createAndAssignHiringAuthority(jobOrderId, hiringAuthorityData) {
    const transaction = await Database.beginTransaction();
    try {
      const jobOrder = await JobOrder.find(jobOrderId);
      if (!jobOrder) {
        return {
          success: false,
          code: 400,
          message: `Job order with id ${jobOrderId} doesn't exist`
        };
      }
      hiringAuthorityData.hiring_authority_status_id = hiringAuthorityStatus.Active;
      hiringAuthorityData.company_id = jobOrder.company_id;
      const hiringAuthorityCreationResult = await HiringAuthorityRepository.create(hiringAuthorityData, transaction);
      if(!hiringAuthorityCreationResult.success){
        return hiringAuthorityCreationResult
      }
      const hiringAuthority = hiringAuthorityCreationResult.data;
      await JobOrderHasHiringAuthority.create({
        job_order_id: jobOrderId,
        hiring_authority_id: hiringAuthority.id
      }, transaction);
      transaction.commit();
      return {
        code: 200,
        success: true,
        data: hiringAuthority
      };
    } catch(error) {
      await transaction.rollback();
      appInsights.defaultClient.trackException({exception: error});
      
      return {
        success: false,
        code: 500,
        message: 'There was a problem assignin the Hiring Authority, please try again later'
      };
    }
  }

  async updateAndAssignHiringAuthority(jobOrderId, hiringAuthorityId, hiringAuthorityData) {
    const transaction = await Database.beginTransaction();
    try {
      const jobOrder = await JobOrder.find(jobOrderId);
      if (!jobOrder) {
        return {
          success: false,
          code: 400,
          message: `Job order with id ${jobOrderId} doesn't exists`
        };
      }
      const hiringAuthority = await HiringAuthority.find(hiringAuthorityId);
      if (!hiringAuthority) {
        return {
          success: false,
          code: 400,
          message: `Hiring Authority with id ${hiringAuthorityId} doesn't exists`
        };
      }
      const isHaAssigned  = await HiringAuthorityRepository.isHiringAuthorityAssignedToCompany(hiringAuthorityId, jobOrder.company_id);
      if (!isHaAssigned) {
        return {
          success: false,
          code: 400,
          message: `The Hiring Authority is not  in the Company from the Job Order`
        };
      }
      if (!(await this.checkIfCanBeAssignedToHiringAuthority(jobOrderId, hiringAuthority.id))) {
        return {
          success: false,
          code: 400,
          message: `The Hiring Authority is already assigned to this Job Order`
        };
      }
      hiringAuthorityData.hiring_authority_status_id = hiringAuthorityStatus.Active;
      hiringAuthority.merge(hiringAuthorityData);
      hiringAuthority.save(transaction);
      await JobOrderHasHiringAuthority.create({
        job_order_id: jobOrderId,
        hiring_authority_id: hiringAuthority.id
      }, transaction);
      await transaction.commit();
      await hiringAuthority.loadMany([
        'specialty',
        'subspecialty',
        'position',
        'hiringAuthorityStatus'
      ]);
      return {
        code: 200,
        success: true,
        data: hiringAuthority
      }
    }  catch(error) {
      await transaction.rollback();
      appInsights.defaultClient.trackException({exception: error});
      
      return {
        success: false,
        code: 500,
        message: 'There was a problem assignin the Hiring Authority, please try again later'
      };
    }
  }

  async getAvailableHiringAuthoritiesAssingTo(job_order_id) {
    try {
      const jobOrder = await JobOrder.findOrFail(job_order_id);

      const subQuery = Database
        .from('job_order_has_hiring_authorities')
        .select(['hiring_authority_id'])
        .where('job_order_id', job_order_id)
  
      const result = await Company.query()
        .where({ id: jobOrder.company_id })
        .with('hiringAuthorities',builder => {
          builder.whereNotIn('hiring_authorities.id',subQuery)
        })
        .with('otherHiringAuthorities',builder => {
          builder.whereNotIn('hiring_authority_has_companies.id',subQuery)
        })
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
        code: 200
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: hiringAuthorities });
      return {
        success: false,
        code: 500,
        message: `There was a problem getting the hiring authorities, please try again later`,
      };     
    }
  }

  async checkIfCanBeAssignedToHiringAuthority(job_order_id, hiring_authority_id) {
    const count = await Database
      .from('job_order_has_hiring_authorities')
      .where('job_order_id', job_order_id)
      .where('hiring_authority_id', hiring_authority_id)
      .count()
    return count[0].count == 0;
  }

  async candidatesToAssign(jobOrderId){
    const jobOrder = await JobOrder.find(jobOrderId)
    if (!jobOrder) {
      return {
        success: false,
        code: 404,
        message: `The job order with th identifier <${jobOrderId}> was not found`
      };
    }
    const specialty = await jobOrder.specialty().fetch()
    const query = await Database.table('candidates as ca')
      .select([
        'ca.id',
        'pi.full_name',
        'spec.title as specialty',
        'spec.id as specialty_id',
        'itry.title as industry',
        'itry.id as industry_id',
        'pst.title as functional_title',
        'pst.id as position_id',
        'sub.title as subspecialty',
        'sub.id as subspecialty_id',
        'cty.title as city',
        'st.slug as state'
      ])
      .innerJoin('personal_informations as pi', 'ca.personal_information_id', 'pi.id')
      .innerJoin('positions as pst', 'ca.position_id', 'pst.id')
      .innerJoin('specialties as spec', 'ca.specialty_id', 'spec.id')
      .leftJoin('subspecialties as sub','ca.subspecialty_id', 'sub.id')
      .innerJoin('industries as itry', 'spec.industry_id', 'itry.id')
      .innerJoin('addresses as add', 'pi.address_id', 'add.id')
      .innerJoin('cities as cty', 'add.city_id', 'cty.id')
      .innerJoin('states as st', 'cty.state_id', 'st.id')
      .where('ca.specialty_id', specialty.id)
      .whereNotExists(function() {
        this.from('job_order_has_candidates as jhc').whereRaw('ca.id = jhc.candidate_id').where('jhc.job_order_id', jobOrderId);
      })
      .orderBy('full_name');

      const bestMatches = remove(query,(value)=>{
        return value.position_id==jobOrder.position_id &&
               value.specialty_id==specialty.id 
      })
      const bySubspecialty = remove(query,(value)=>{
        return value.subspecialty_id==(jobOrder.subspecialty_id || 0)
      });
      const bySpecialty = query;

      /* Take 200 maximimum temporary while refining matching method */
      const allItems = [
        ...bestMatches.map(each => ({...each, group: 'With the same functional title'})),
        ...bySubspecialty.map(each => ({...each, group: 'In the same subspecialty'})),
        ...bySpecialty.map(each => ({...each, group: 'In the same Specialty'}))
      ].slice(0, 200);

      return {
        code: 200,
        success: true,
        data : allItems
      }   
  }

  async assignCandidate(candidate_id,job_order_id){
    const jobOrder = await JobOrder.find(job_order_id);
    if (!jobOrder) {
      return {
        success: false,
        code: 404,
        message: `The job order with th identifier <${job_order_id}> was not found`
      };
    }
    const jobOrderCandidate =  await JobOrderHasCandidate.query()
      .where('job_order_id',job_order_id)
      .where('candidate_id',candidate_id)
      .first();
    if(jobOrderCandidate){
      return {
        success: false,
        code: 400,
        message: `The Candidate already belongs to this Job Order`
      };
    }
    const jobOrderCandidateMatch = await JobOrderHasCandidate.create({
      candidate_id,
      job_order_id
    })
    const candidate = await this.getCandidateBasicInfo(candidate_id);
    Event.fire(EventTypes.JobOrder.CandidateMatched, { jobOrderCandidateMatch });
    return {
      code:201,
      data:candidate,
      message:"The Candidate was assigned succesfully!"
    };
  }

  async removeCandidate(candidate_id,job_order_id){
    const jobOrder = await JobOrder.find(job_order_id);
    if (!jobOrder) {
      return {
        success: false,
        code: 404,
        message: `The Job Order with the Identifier <${job_order_id}> was not found`
      };
    }
    const jobOrderCandidate =  await JobOrderHasCandidate.query()
      .where('job_order_id',job_order_id)
      .where('candidate_id',candidate_id)
      .first();
    if(!jobOrderCandidate){
      return {
        success: false,
        code: 404,
        message: `The relation you are trying to remove does not exist!`
      };
    }
    await jobOrderCandidate.delete();
    return {
      code:200,
      message:"The Candidate was removed from the Job Order succesfully!"
    };
  }

  async getCandidateBasicInfo(candidateId){
    const query = await Candidate.query()
      .where({id:candidateId})
      .setHidden([
        'personal_information_id',
        'industry_id',
        'position_id',
        'status_id',
        'recruiter_id',
        'hot_item_date',
        'current_company',
        'source_type_id',
        'specialty_id',
        'subspecialty_id',
        'migration_record',
        'migration_record_changed',
        'last_activity_date',
        'stand_by_date',
        'inactive_date',
        'activityStatus',
        ...auditFields])
      .with('recruiter', builder => {
        builder.setHidden([
          'double_authentication',
          'step_wizard',
          'personal_information_id',
          'user_status_id',
          ...auditFields
        ]);
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
      })
      .with('position', (builder) => {
        builder.setHidden(['industry_id', ...auditFields]);
      })
      .with('specialty', (builder) => {
        builder.setHidden(['industry_id', ...auditFields]);
        builder.with('industry', (builder) => {
          builder.setHidden(auditFields);
        })
      })
      .with('blueSheets', (builder) => {
        builder.setHidden([
          'candidate_id',
          'reason_leaving',
          'relocation',
          'achievement_one',
          'achievement_two',
          'achievement_three',
          'experience',
          'time_looking',
          'time_to_start',
          'notes',
          'time_start_type_id',
          'candidate_type_id',
          'interview_dates',
          ...auditFields]);
      })
      .first()
    return query;
  }

  async getLastActivity(jobOrderId) {
    if (!Number.isInteger(Number(jobOrderId))) {
      throw { message:'Parameter jobOrderId must be an integer' }
    }
    const query = Database
      .select([
        'alt.title',
        'jal.created_at as date',
        'pi.full_name as user'
      ])
      .from('job_order_activity_logs as jal')
      .leftJoin('activity_log_types as alt', 'jal.activity_log_type_id', 'alt.id')
      .leftJoin('users', 'jal.user_id', 'users.id')
      .leftJoin('personal_informations as pi', 'users.personal_information_id', 'pi.id')
      .where('job_order_id', jobOrderId)
      .whereRaw('jal.created_at = (select max(created_at)  from job_order_activity_logs where job_order_id = ? )', [jobOrderId]);
    const result = await query.first();
    return await result;
  }


  async assignToRecruiter(jobOrderId, recruiterId, userId) {
    try {
      const jobOrder = await JobOrder.find(jobOrderId);
      if (!jobOrder) {
        return {
          success: false,
          code: 404,
          message: 'Job Order not found'
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
      const res = await RecruiterRepository.canAssign(recruiter.id, userId);
      if (!res.success) {
        return res;
      }
      
      if (jobOrder.recruiter_id == recruiter.id || (await this.isARecruiterAssigned(jobOrderId, recruiter.id))) {
        return {
          success: false,
          code: 400,
          message: 'Recruiter already assigned. Remove that assignment first and try again.'
        };
      }

      const previousRecruiterId = jobOrder.recruiter_id;
      jobOrder.recruiter_id = recruiter.id;
      const recruiterAssignment = await JobOrderRecruiterAssignment.create({job_order_id: jobOrder.id, recruiter_id: jobOrder.recruiter_id, coach_id: userId});
      await jobOrder.save();
  
      Event.fire(EventTypes.JobOrder.RecruiterReassigned, { recruiterAssignment, previousRecruiterId, userId });
      return {
        success: true,
        code: 200,
        data: recruiter
      };
    } catch(error) {
      appInsights.defaultClient.trackException({ exception: error });
      return { success: false, code:500, message: 'There was a problem assigning recruiter, please try again after' };
    }
  }

  async getAssignationHistory(jobOrderId) {
    const jobOrder = await JobOrder.find(jobOrderId);
    if (!jobOrder) {
      return {
        success: false,
        code: 404,
        message: 'The Job Order was not found'
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
        .from('job_order_recruiter_assignments as cra')
        .join('users as creator', 'creator.id', 'cra.coach_id')
        .leftJoin('users as otherRecruiter', 'otherRecruiter.id', 'cra.another_recruiter_id')
        .join('users as recruiter', 'recruiter.id', 'cra.recruiter_id')
        .join('personal_informations as pi_creator', 'pi_creator.id', 'creator.personal_information_id')
        .join('personal_informations as pi_recruiter', 'pi_recruiter.id', 'recruiter.personal_information_id')
        .leftJoin('personal_informations as pi_other_recruiter', 'pi_other_recruiter.id', 'otherRecruiter.personal_information_id')

        .where('job_order_id', jobOrderId)
        .orderBy('cra.created_at', 'desc');
      return {
        success: true,
        code: 200,
        data,
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
      return { success: false, code: 500, message: 'There was a problem getting the assignment history' };
    }
  }

  /**
   * @deprecated  
   * 
   * Generates
   * the metrics to evaluate the job order
   *
   * @method initializeOperatingMetrics
   *
   * @param {Integer} jobOrderId
   *
   *
   */
  async initializeOperatingMetrics(jobOrderId, userId) {
    try {
      const jobOrder = await JobOrder.find(jobOrderId);
      if (!jobOrder) {
        return null;
      }
      const seventyTwoHoursInms = 72 * (60 * 60 * 1000);
      const templateMetrics = await OperatingMetricConfiguration.findByOrFail('entity', EntityTypes.JobOrder);
      const range = humanInterval(templateMetrics.metric_frequency) || seventyTwoHoursInms;
      const start_date = moment().format(DateFormats.SystemDefault);
      const end_date = moment(start_date).subtract(1, 'minutes').add(range, 'milliseconds').format(DateFormats.SystemDefault);
      const lastOperating = await JobOrderOperatingMetric.query().where('job_order_id',jobOrderId).where('created_by', userId).orderBy('start_date','desc').first();
      if(lastOperating){
        const activitiesNoRecurrents = filter(lastOperating.checklist,function(value) { 
          return value.completed && !value.recurrent; 
        });
        for(const activity of activitiesNoRecurrents){
          const position = findIndex(templateMetrics.checklist, function (value) {
            return activity.activityId == value.activityId;
          });
          if(position != -1){
            templateMetrics.checklist[position].completed = true;
            templateMetrics.checklist[position].reference = activity.reference;
            templateMetrics.checklist[position].completedAt = activity.completedAt;
          }
        }
      }
      const operatingMetric = await JobOrderOperatingMetric.create({
        job_order_id: jobOrderId,
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
   * @method evaluateMetricOnActivityCreation
   *
   * @param {Object} jobOrderActivityLog
   *
   */
  async evaluateMetricOnActivityCreation(jobOrderActivityLog) {
    let operatingMetric = null;
    const { job_order_id ,user_id } = jobOrderActivityLog;
    const jobOrder = await JobOrder.find(job_order_id);
    if (!jobOrder) {
      return null;
    }
    const whiteSheet = await WhiteSheetRepository.getByJobOrder(job_order_id);
    const additionalRecruiter =  await this.existAdditionalRecruiter({
      jobOrderId: job_order_id,
      status: AdditionalRecruiterStatus.Approved,
      recruiterId: user_id
    });
    if(!additionalRecruiter && jobOrder.recruiter_id !== user_id){
      return null;
    }
    const ownerMetricId = additionalRecruiter
    ? additionalRecruiter.type === AdditionalRecruiterTypes.Accountable
      ? user_id
      : additionalRecruiter.recruiter_to_collaborate_id
    : jobOrder.recruiter_id;
    const metrics = await JobOrderOperatingMetric.query().where('job_order_id', whiteSheet.job_order_id).where('created_by',ownerMetricId).fetch();
    if (metrics.rows.length === 0) {
      operatingMetric = await this.initializeOperatingMetrics(whiteSheet.job_order_id,ownerMetricId);
      Event.fire(EventTypes.JobOrder.MetricsInitialized, { jobOrderId: whiteSheet.job_order_id, userId: ownerMetricId });
    }else{
      operatingMetric = await this.getMetricWithActivity(jobOrderActivityLog, 'false', ownerMetricId);
    }
    if (!operatingMetric) {
      return null;
    }
    const position = findIndex(operatingMetric.checklist, function (value) {
      return value.activityId == jobOrderActivityLog.activity_log_type_id;
    });
    if (position != -1) {
      operatingMetric.checklist[position].completed = true;
      operatingMetric.checklist[position].completedAt = moment().format(DateFormats.SystemDefault);
      operatingMetric.checklist[position].reference = jobOrderActivityLog;
      operatingMetric.updated_by = ownerMetricId;
      await operatingMetric.save();
    }
    Event.fire(EventTypes.JobOrder.CheckMetricStatus, { operatingMetric });
  }

  /**
   * @deprecated  
   * 
   * Evaluates if the deleted activity affects a completed
   * metric
   *
   * @method evaluateMetricOnActivityDelete
   *
   * @param {Object} jobOrderActivityLog
   *
   */
  async evaluateMetricOnActivityDelete(jobOrderActivityLog) {
    const { job_order_id ,user_id, activity_log_type_id } = jobOrderActivityLog;
    const jobOrder = await JobOrder.find(job_order_id);
    if (!jobOrder) {
      return null;
    }
    await WhiteSheetRepository.getByJobOrder(jobOrderActivityLog.job_order_id);
    const additionalRecruiter =  await this.existAdditionalRecruiter({
      jobOrderId: job_order_id,
      status: AdditionalRecruiterStatus.Approved,
      recruiterId: user_id
    });
    if(!additionalRecruiter && jobOrder.recruiter_id !== user_id){
      return null;
    }
    const ownerMetricId = additionalRecruiter
    ? additionalRecruiter.type === AdditionalRecruiterTypes.Accountable
      ? user_id
      : additionalRecruiter.recruiter_to_collaborate_id
    : jobOrder.recruiter_id;
    const operatingMetric = await this.getMetricWithActivity(jobOrderActivityLog, 'true', ownerMetricId);
    if(!operatingMetric){
      return null;
    }
    const start_date = moment(operatingMetric.start_date).format(DateFormats.SystemDefault);
    const end_date = moment(operatingMetric.end_date).format(DateFormats.SystemDefault);
    const activity = await JobOrderActivityLog.query()
      .where('job_order_id', job_order_id)
      .where('activity_log_type_id', activity_log_type_id)
      .where(function(){
        this.where('user_id', user_id)
        additionalRecruiter ?   this.orWhere('user_id',ownerMetricId) : null
      })
      .whereRaw(`created_at at time zone 'utc' BETWEEN '${start_date}'::timestamp  AND '${end_date}'::timestamp `)
      .orderBy('created_at', 'asc')
      .first();
    const position = findIndex(operatingMetric.checklist, function (value) {
      return value.activityId == activity_log_type_id;
    });
    if (position != -1) {
      if (!activity && !operatingMetric.checklist[position].recurrent) {
        await this.unmarkRecurrentActivity(jobOrderActivityLog, ownerMetricId);
      } else if (!activity) {
        operatingMetric.checklist[position].completed = false;
        operatingMetric.checklist[position].reference = null;
        operatingMetric.updated_by = user_id;
        await operatingMetric.save();
      }else if (operatingMetric.checklist[position].reference.id == jobOrderActivityLog.id) {
        operatingMetric.checklist[position].reference = activity;
        operatingMetric.updated_by = activity.user_id;
        await operatingMetric.save();
      }
    }
  }


  /**
   * @deprecated  
   * 
   * Unmark all the prevous activities if the 
   * deleted activity was a recurrent one
   *
   * @method unmarkRecurrentActivity
   * @param {Object} jobOrderActivityLog
   * @param {Integer} ownerMetricId
   *
   */
  async unmarkRecurrentActivity(jobOrderActivityLog, ownerMetricId){
    const previousOperatings  = await JobOrderOperatingMetric.query().where('job_order_id',jobOrderActivityLog.job_order_id).where('created_by', ownerMetricId).fetch();
    for(const operating of previousOperatings ? previousOperatings.rows : []){
      
      const position = findIndex(operating.checklist, function (value) {
        return value.activityId == jobOrderActivityLog.activity_log_type_id;
      });
      if (position != -1) {
        operating.checklist[position].reference = null ;
        operating.checklist[position].completed = false ;
        operating.updated_by = ownerMetricId;
        await operating.save();
      }
    }
  }

  /**
   * @deprecated  
   * 
   * Returns the Job Order Metric Operation that
   * meets some requirements
   *
   * @method getMetricWithActivity
   *
   * @param {Object} jobOrderActivityLog
   * @param {String} status
   * @param {Integer} ownerMetricId
   * @return {Object} An Operation Job Order Metric object or null
   *
   */
  async getMetricWithActivity(jobOrderActivityLog, status, ownerMetricId) {
    const time = moment(jobOrderActivityLog.created_at).format(DateFormats.SystemDefault);
    return await JobOrderOperatingMetric.query()
      .where('job_order_id', jobOrderActivityLog.job_order_id)
      .where('created_by', ownerMetricId)
      .whereRaw(`checklist @> '[{"activityId":${jobOrderActivityLog.activity_log_type_id},"completed":${status}}]'`)
      .whereRaw(
        `start_date <= '${time}'::timestamp at time zone 'utc' and  end_date > '${time}'::timestamp at time zone 'utc'`
      )
      .orderBy('start_date', 'desc')
      .first();
  }

  /**
   * Return the job order metrics from an user
   *
   * @method getMetricsByUser
   *
   * @param {Integer} userId
   *
   * @return {Object} JobOrderMetrics data or an error code
   */
  async getMetricsByUser(userId) {
    try {
      const metrics =  Database.select([
        Database.raw(
          'distinct on (jm.job_order_id) last_value(jm.start_date) over (partition by jm.job_order_id  order by jm.start_date asc RANGE BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) as start_date'
        ),
        'jm.job_order_id as id',
        'jm.end_date',
        'jm.checklist',
        'jo.title',
        'pst.title as subtitle',
      ])
        .from('job_order_operating_metrics as jm')
        .innerJoin('job_orders as jo', 'jm.job_order_id', 'jo.id')
        .innerJoin('white_sheets as wsh', 'jo.id', 'wsh.job_order_id')
        .innerJoin('specialties as spec', 'jo.specialty_id', 'spec.id')
        .innerJoin('positions as pst', 'jo.position_id', 'pst.id')
        .leftJoin('job_order_additional_recruiters as jar','jo.id','jar.job_order_id')
        .where(function () {
          this.where('jo.recruiter_id', userId).orWhere(
            Database.raw('jar.recruiter_id = ? and jar.type = ? and jar.status = ?', [
              userId,
              AdditionalRecruiterTypes.Accountable,
              AdditionalRecruiterStatus.Approved,
            ])
          );
        })
        .where('jm.created_by', userId)
        .whereIn('wsh.job_order_type_id', [JobOrderTypeSchemes.SearchAssignment, JobOrderTypeSchemes.Poejo])
        .orderByRaw('jm.job_order_id,jm.created_at desc');
      
      const data = await Database.raw(`select * from (${metrics}) as subquery order by start_date desc`)
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
   * a job order
   *
   * @method getCurrentOperating
   *
   * @param {Intger} jobOrderId
   *
   * @return {Object} Operating Job Order Metric
   */

  async getCurrentOperating(jobOrderId, userId) {
    const time = moment().format(DateFormats.SystemDefault);
    return await JobOrderOperatingMetric.query()
      .where('job_order_id', jobOrderId)
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
   * of the job order changes
   *
   * @method evaluateMetricsWhenStatusChange
   *
   * @param {Integer} jobOrderId
   * @param {Integer} previousJobOrderTypeId
   * @param {Integer} userId
   *
   */
  async evaluateMetricsWhenStatusChange(jobOrderId, previousJobOrderTypeId = null, userId) {
    const isAnOngoingItem = await this.isAnOngoingItem(jobOrderId);
    const metrics = await JobOrderOperatingMetric.query().where('job_order_id', jobOrderId).fetch();
    if ((previousJobOrderTypeId && previousJobOrderTypeId !== JobOrderTypeSchemes.SearchAssignment) && isAnOngoingItem) {
      Event.fire(EventTypes.JobOrder.MetricsStopped, { jobOrderId });
      await this.initializeAllUsersMetricByJobOrder(jobOrderId);
    } else if (isAnOngoingItem) {
      if(metrics.rows.length == 0){
        await this.initializeAllUsersMetricByJobOrder(jobOrderId);
      }else if(!find(metrics.rows, { created_by: userId })){
        await this.initializeOperatingMetrics(jobOrderId, userId);
        Event.fire(EventTypes.JobOrder.MetricsInitialized, { jobOrderId, userId });
      }
    } else if (!isAnOngoingItem) {
      Event.fire(EventTypes.JobOrder.MetricsStopped, { jobOrderId: jobOrderId });
    }
  }


    /**
   * 
   *
   * @method initializeAllUsersMetricByJobOrder
   *
   * @param {Integer} id
   *
   */
  async initializeAllUsersMetricByJobOrder(id){
    const jobOrder = await JobOrder.query()
      .with('additionalRecruiters', (builder) => {
        builder.where('type', '=', AdditionalRecruiterTypes.Accountable)
        builder.where('status','=',AdditionalRecruiterStatus.Approved)
      })
      .where({id})
      .first();
    if(!jobOrder){
      return null;
    }
    const jobOrderJson = jobOrder.toJSON();
    jobOrderJson.additionalRecruiters.push({recruiter_id:jobOrderJson.recruiter_id})
    for(const additional of jobOrderJson.additionalRecruiters){
      await this.initializeOperatingMetrics(id, additional.recruiter_id);
      Event.fire(EventTypes.JobOrder.MetricsInitialized, { jobOrderId: id, userId: additional.recruiter_id });
    }
  }

    /**
   * @deprecated  
   *  Returns the metrics for the job order
   *
   * @method getOperatingMetrics
   *
   * @param {Integer} jobOrderId
   *
   */
  async getOperatingMetrics(jobOrderId){
    try {
      const operatings = await JobOrderOperatingMetric.query()
        .where('job_order_id',jobOrderId)
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
        .orderBy('start_date','desc')
        .fetch();
      return {
        code : 200,
        data: operatings
      }
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
      return { success: false, code: 500, message: 'There was a problem getting the information' };
    }
  }


  /**
   * Returns hiring authorities from the job orders
   *
   * @method getAvailableHiringAuthoritiesAssingTo
   *
   * @param {Array} jobOrderIds
   *
   * @return {Object} Hiring Authorities
   */
  async getAvailableHiringAuthoritiesByArray(jobOrderIds) {
    try {
      const hiringAuthorities = await JobOrderHasHiringAuthority.query().whereIn('job_order_id', jobOrderIds).fetch()
      
      return {
        success: true,
        data: hiringAuthorities.toJSON().map((row) => row.hiring_authority_id),
        code: 200
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
      return {
        success: false,
        code: 500,
        message: `There was a problem while getting the hiring authorities, please try again later`,
      };     
    }
  }


  
  /**
   * Log a job order status (type) change
   *
   * @method markJobOrdersFreeGame
   *
   * This method marks the free game field on the job orders.
   * There are two cases to evaluate :
   *    1.The job order will be set as free game if the last activiy date has more than 21 days.
   *      At the same time the job should be ALPHA or SEARCH_ASSIGNMENT and doesn't have
   *      an additional accountable recruiter assigned.
   *    2.The job order will be set as not free game if the last activity date  
   *      is less then 21 days.Also if the job order is no longer ALPHA or SEARCH_ASSIGNMENT or exist an accountable recruiter
   *      active.
   */
  async markJobOrdersFreeGame({ jobOrderId, evaluateAll = false }) {
    const numberOfDays = 21;
    const whereClausItem = evaluateAll ? '' : 'WHERE jo.id = :jobOrderId';
    try {
      const activityDateEvalStatement = (operator) => {
        return `
          ( jo.last_activity_date IS NULL AND Date_part('day', Now() - jo.created_at) ${operator} :twentyOneDays ) 
          OR 
          ( jo.last_activity_date IS NOT NULL AND Date_part('day', Now() - jo.last_activity_date) ${operator} :twentyOneDays )
        `;
      }
      const additionalRecruiterStatement = 'SELECT id FROM job_order_additional_recruiters WHERE job_order_id = jo.id AND type = :accountable AND status = :approved';
      await Database.raw( `
        UPDATE job_orders SET free_game = items.status_to_change
          FROM
          (
            SELECT jo.id,
              (CASE 
                  WHEN jo.free_game = false 
                    AND(  
                      ws.job_order_type_id = :typeSearchAssignment 
                      AND jo.status_id = :statusOngoing
                      AND ( ${activityDateEvalStatement('>')})
                      AND NOT EXISTS ( ${additionalRecruiterStatement} ) 
                    )
                    THEN true
                  WHEN  jo.free_game = true 
                    AND(
                      ( ${activityDateEvalStatement('<')} )
                      OR EXISTS ( ${additionalRecruiterStatement} ) 
                      OR ws.job_order_type_id != :typeSearchAssignment
                      OR jo.status_id != :statusOngoing
                    )
                    THEN false
                  ELSE null
              END) status_to_change
              FROM job_orders jo INNER JOIN white_sheets as ws ON ws.job_order_id = jo.id ${whereClausItem}
          )AS items where job_orders.id = items.id
        AND items.status_to_change IS NOT null
      `,
        {
          typeSearchAssignment: JobOrderTypeSchemes.SearchAssignment,
          statusOngoing : JobOrderStatusSchemes.Ongoing,
          twentyOneDays :numberOfDays,
          accountable: AdditionalRecruiterTypes.Accountable,
          approved :AdditionalRecruiterStatus.Approved,
          jobOrderId
        }
      );
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
    }
  }  

      /**
   * Log a Job Order  change
   *
   * @method logChange
   *
   * @param {integer} jobOrderId
   * @param {string} entity Name of the changed entity (job order, whitesheet, note, attachment, etc.)
   * @param {string} operation Related operation (create, update, delete)
   * @param {payload} payload Content of the changed object 
   * @param {integer} userId User that trigered the action
   *
   */
  async logChange(jobOrderId, entity, operation, payload, userId){
    try {
      await JobOrderChangeLog.create({
        job_order_id: jobOrderId,
        entity,
        operation,
        payload,
        created_by: userId,
      })
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
    }
  }

  /**
   * Set job order's free game flag
   *
   * @method setFreeGame
   *
   * @param {Integer} jobOrderId
   * @param {Boolean} isFreeGame
   *
   */
  async setFreeGame(jobOrderId, isFreeGame) {
    try {
      await JobOrder.query().where('id', jobOrderId).update({ free_game: isFreeGame });
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
    }
  }

   /**
   * Log a job order status (type) change
   *
   * @method logStatusChange
   *
   * @param {Integer} jobOrderId
   * @param {Integer} typeId
   * @param {Integer} userId
   *
   */
  async logStatusChange(jobOrderId, typeId, userId){
    try {
      await JobOrderTypeLog.create({
        job_order_id: jobOrderId,
        job_order_type_id: typeId,
        created_by: userId,
      })
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
   * @param {Integer} jobOrderId
   * @param {Object} requestData
   * @param {Integer} eventUserId
   *
   * @return {Object} Job Order Additional Recruiter
   */
  async createAdditionalRecruiterRequest(jobOrderId, requestData, currentUser) {
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
      const jobOrder = await JobOrder.find(jobOrderId);
      if (!jobOrder) {
        return {
          code: 404,
          success: false,
          message: 'Job Order not found',
        };
      }
      
      if((await this.isARecruiterAssigned(jobOrderId, target_recruiter_id))) {
        const user = await User.find(target_recruiter_id);
        return {
          code: 400,
          success: false,
          message: `Recruiter ${user ? '('+user.initials+')' : ''} already assigned. Remove that assignment first and try again.`,
        }
      }
  
      switch (type) {
        case AdditionalRecruiterTypes.Accountable:
          result = await this.canAssignAnAccountable(jobOrder, currentUser.id, target_recruiter_id, type);
          break;
        case AdditionalRecruiterTypes.Collaborator:
          result = await this.canAssignACollaborator(jobOrder, currentUser.id);
          break;
      }
      if (!result.success) {
        return result;
      }
      const isCoach = await UserRepository.hasRole(currentUser.id, userRoles.Coach);
      const recruiterToCollaborateId = recruiter_to_collaborate_id || (isCoach ? jobOrder.recruiter_id : currentUser.id);
    
      const jobOrderAdditionalRecruiter = await JobOrderAdditionalRecruiter.create({
        recruiter_to_collaborate_id: type === AdditionalRecruiterTypes.Collaborator ? recruiterToCollaborateId : null,
        recruiter_id: target_recruiter_id,
        job_order_id: jobOrderId,
        notes,
        type,
        status: AdditionalRecruiterStatus.Approved,
        created_by: currentUser.id,
        updated_by: currentUser.id,
      });

      if(type === AdditionalRecruiterTypes.Accountable){
        await this.setFreeGame(jobOrderId, false);
      }
    
      Event.fire(EventTypes.JobOrder.AdditionalRecruiterRequested, { additionalRecruiter: jobOrderAdditionalRecruiter, userId: currentUser.id, action: 'assign' });

      await jobOrderAdditionalRecruiter.loadMany({
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
      jobOrderAdditionalRecruiter.coach = await RecruiterRepository.getCoachInfoByRecruiterId(
        jobOrderAdditionalRecruiter.recruiter_id
      );

      return {
        success: true,
        code: 201,
        data: jobOrderAdditionalRecruiter,
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
   * assign a recruiter for the job order
   *
   * @method canAssignAnAccountable
   *
   * @param {Object} jobOrder
   * @param {Integer} eventUserId
   * @param {Integer} target_recruiter_id
   * @param {String} type
   *
   */
  async canAssignAnAccountable(jobOrder, eventUserId, target_recruiter_id, type) {
    const recruiterAccountable = await this.existAdditionalRecruiter({
      jobOrderId: jobOrder.id,
      status: AdditionalRecruiterStatus.Approved,
      type
    });
    const hasOverridePermission = await UserRepository.hasPermission(eventUserId, userPermissions.inventory.overrideAssignment);
    if(hasOverridePermission && (jobOrder.free_game || recruiterAccountable)){
      return {
        success: true,
      };
    }

    const coachAccountable = recruiterAccountable ? await RecruiterRepository.getCoachInfoByRecruiterId(recruiterAccountable.recruiter_id) : null;
    if (!jobOrder.free_game && !coachAccountable) {
      return {
        code: 400,
        success: false,
        message: 'The Job Order provided is not a free game',
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
   * assign a recruiter for the job order
   *
   * @method canAssignACollaborator
   *
   * @param {Object} jobOrder
   * @param {Integer} eventUserId
   * @param {Integer} target_recruiter_id
   *
   */
  async canAssignACollaborator(jobOrder, eventUserId) {
    const isCoach = await UserRepository.hasRole(eventUserId, userRoles.Coach);
    const hasOverridePermission = await UserRepository.hasPermission(eventUserId, userPermissions.inventory.overrideAssignment);
   
    if (
      jobOrder.recruiter_id !== eventUserId &&
      !(await this.isARecruiterOnTheJobOrder(jobOrder.id, eventUserId)) &&
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
   * Returns wherever the recruiter is working on the job order
   *
   * @method isARecruiterOnTheJobOrder
   *
   * @param {Integer} jobOrderId
   * @param {Integer} recruiterId
   * 
   * 
   *
   */
  async isARecruiterOnTheJobOrder(jobOrderId, recruiterId) {
    const result = await Database.from('job_orders as jo')
      .select(['jo.id'])
      .leftJoin('job_order_additional_recruiters as jar', 'jo.id', 'jar.job_order_id')
      .where('jo.id', jobOrderId)
      .where(function () {
        this.where('jo.recruiter_id', recruiterId).orWhere(
          Database.raw('jar.recruiter_id = ? and jar.type = ? and jar.status = ?', [
            recruiterId,
            AdditionalRecruiterTypes.Accountable,
            AdditionalRecruiterStatus.Approved,
          ])
        );
      })
      .first();
    return !!result;
  }

  
    /**
   * Returns wherever the coach is working on the jobOrder
   *
   * @method isACoachOnTheJobOrder
   *
   * @param {Integer} jobOrderId
   * @param {Integer} coachId
   * 
   * 
   *
   */ 
  async isACoachOnTheJobOrder(jobOrderId, coachId) {
    const result = await Database.from('job_orders as jo')
      .select(['jo.id'])
      .joinRaw('left join job_order_additional_recruiters as jar on jo.id = jar.job_order_id and  jar.type = ? and jar.status = ?',[AdditionalRecruiterTypes.Accountable,AdditionalRecruiterStatus.Approved])
      .joinRaw('left join recruiter_has_industries as rhi on jo.recruiter_id = rhi.recruiter_id or jar.recruiter_id = rhi.recruiter_id')
      .where('jo.id', jobOrderId)
      .where('rhi.coach_id',coachId)
      .first();
    return !!result;
  }



    /**
   * Returns the info of the additional recruiters
   *
   * @method getAdditionalRecruitersInfo
   *
   * @param {Integer} jobOrderId
   * @param {String} status
   */
  async getAdditionalRecruitersInfo(jobOrderId,status){
    try {
      const approvedRecruiters = await JobOrderAdditionalRecruiter.query()
        .where('job_order_id', jobOrderId)
        .where('status', status)
        .with('recruiter', userBuilder)
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
   * @param {Integer} jobOrderId
   * @param {Integer} recruiterId
   * @param {Integer} recruiterToCollaborateId
   * @param {String} type
   * @param {String} status
   */
  async existAdditionalRecruiter({jobOrderId, recruiterId, recruiterToCollaborateId, type, status}){
    const recruiterAccountableQuery =  JobOrderAdditionalRecruiter.query();
      recruiterAccountableQuery.where('job_order_id', jobOrderId)
      type ? recruiterAccountableQuery.where('type', type) : null;
      recruiterId ? recruiterAccountableQuery.where('recruiter_id',recruiterId) : null;
      recruiterToCollaborateId ? recruiterAccountableQuery.where('recruiter_to_collaborate_id',recruiterToCollaborateId) : null ;
      status ? recruiterAccountableQuery.where('status',AdditionalRecruiterStatus.Approved) : null;
    return await recruiterAccountableQuery.first();
  }

  async isARecruiterAssigned(jobOrderId, recruiterId) {
    const result = await Database.from('job_orders as jo')
      .select(['jo.id'])
      .leftJoin('job_order_additional_recruiters as joar', 'jo.id', 'joar.job_order_id')
      .where('jo.id', jobOrderId)
      .where(function () {
        this.where('jo.recruiter_id', recruiterId).orWhere(
          Database.raw('joar.recruiter_id = ? and joar.status = ?', [
            recruiterId,
            AdditionalRecruiterStatus.Approved,
          ])
        );
      })
      .first();
      
    return result ? true : false;
  }
  /**
   * Deletes an additional recruiter of a job order
   * 
   * @method deleteAdditionalRecruiter
   *
   * @param {Integer} recruiterRequestId The id of the addition recruiter request
   * @param {Integer} jobOrderId
   * @param {Integer} userId
   *
   * @return {Object} A success with a code 200  or an error code
   *
   */
  async deleteAdditionalRecruiter(recruiterRequestId, jobOrderId, userId) {
    try {
      const additionalRecruiter = await JobOrderAdditionalRecruiter.find(recruiterRequestId);

      const canDeleteResult = await this.canEditAdditionalRecruiter(additionalRecruiter, jobOrderId, userId);
      if(!canDeleteResult.success)  {
        return canDeleteResult;
      }
      
      await additionalRecruiter.delete();
      if(additionalRecruiter.type === AdditionalRecruiterTypes.Accountable){
        await this.markJobOrdersFreeGame({ jobOrderId: Number(jobOrderId) });
      }

      Event.fire(EventTypes.JobOrder.AdditionalRecruiterRemoved, {
        additionalRecruiter,
        userId,
        action: 'remove'
      });

      return {
        success: true,
        code: 200,
        message: 'The additional recruiter was removed from this job order!',
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
   * Updates an additional recruiter of a job order
   * 
   * @method updateAdditionalRecruiter
   *
   * @param {Integer} recruiterRequestId
   * @param {Integer} jobOrderId
   * @param {Integer} userId
   *
   * @return {Object} A success with a code 200  or an error code
   *
   */
  async updateAdditionalRecruiter(recruiterRequestId, jobOrderId, payload, userId) {
    try {
      const { target_recruiter_id: recruiter_id, recruiter_to_collaborate_id } = payload;
      const additionalRecruiter = await JobOrderAdditionalRecruiter.find(recruiterRequestId);

      const canEditResult = await this.canEditAdditionalRecruiter(additionalRecruiter, jobOrderId, userId);
      if (!canEditResult.success) {
        return canEditResult;
      }
      if ((await this.isARecruiterAssigned(jobOrderId, recruiter_id))) {
        const user = await User.find(recruiter_id);
        return {
          code: 400,
          success: false,
          message: `Recruiter ${user ? '('+user.initials+')' : ''} already assigned. Remove that assignment first and try again.`,
        }
      }

      await additionalRecruiter.merge({ recruiter_id, recruiter_to_collaborate_id, updated_by: userId });
      await additionalRecruiter.save();

      Event.fire(EventTypes.JobOrder.AdditionalRecruiterUpdated, {
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

  async canEditAdditionalRecruiter(additionalRecruiter = {}, jobOrderId, userId) {
    try {
      const { job_order_id, recruiter_id: additionalUserId = null, created_by: accountableUserId = null } = additionalRecruiter;
      if (!additionalUserId) {
        return {
          code: 404,
          message: Antl.formatMessage('messages.error.notFound', { entity: 'additional recruiter' })
        };
      }

      if (job_order_id != jobOrderId) {
        return {
          code: 404,
          message: Antl.formatMessage('messages.error.notFound', { entity: 'job order' })
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
      const {job_order_id, recruiter_id, type, recruiter_to_collaborate_id} = additionalRecruiter;
      await JobOrderRecruiterAssignment.create({
        job_order_id,
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
  
  async getBasicInfo(jobOrderId) {
    try {
      const jobOrder = await JobOrder.find(jobOrderId);

      if(!jobOrder) return null;
      await jobOrder.load('recruiter', userBuilder);

      return jobOrder;
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      return {
        success: false,
        code: 500,
        message: 'There was a problem retreieving the job order',
      };
    }
  }

  /**
   * Returns template info from a job order id
   *
   * @method template
   *
   * @param {Integer} id
   *
   * @return {Object} template
   */
  async getInfoToTemplate(id) {
    const query = JobOrder.query()
      .where({ id })
      .setHidden([
        'hiring_authority_id',
        'company_id',
        'recruiter_id'
      ])
      .with('hiringAuthorities');

    const jobOrder = await query.first();

    if (!jobOrder) {
      return null;
    }

    const jobOrderJson = jobOrder.toJSON();
    const coach = await RecruiterRepository.getCoachInfoByRecruiterId(jobOrder.recruiter_id);
    const company = await Company.query().where('id', jobOrder.company_id).first();
    const companyJson = company.toJSON();

    return {
      ...jobOrderJson,
      coach: coach || null,
      company: companyJson
    };
  }

  /**
   * Returns placements from a job order
   *
   * @method placements
   *
   * @param {Integer} id
   *
   * @return {Object} Placements
   */
  async placements(id) {
    try {
      const placementsList = await PlacementRepository.getPreviews({ job_order_id: id });
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

  async changeOwnershipItems(oldUserId, newUserId, userLogId, extTransaction){
    let trx;
    const logsData = [];
    const date =  moment().format(DateFormats.SystemDefault);
    try {
      trx = extTransaction || (await Database.beginTransaction());

      const {  joIds = [] } = await this.updateOwnerUrgentItems(oldUserId, newUserId, date, userLogId, trx);
      const {  joIdsFreeGame = [] } = await this.updateOwnerFreeGameItems(oldUserId, newUserId, date, userLogId, trx);

      //Log Info
      for(const joId of [...joIds,...joIdsFreeGame]){
        const _type = joIds.includes(joId) ? 'main' : AdditionalRecruiterTypes.Accountable;
        logsData.push({       
          job_order_id: joId,
          recruiter_id: newUserId,
          coach_id: userLogId,
          type: _type,
          created_at: date,
          updated_at: date
        });
      }
      //Insert Logs
      await trx.insert(logsData).into('job_order_recruiter_assignments');

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
    const joIds = await trx
      .table('job_orders as jo')
      .where('jo.recruiter_id', oldUserId)
      .whereNotExists((builder) => {
        builder.select('id')
          .from('job_order_additional_recruiters as jodr')
          .whereRaw(
            `
            jo.id = jodr.job_order_id AND 
            jodr.recruiter_id = :newUserId  AND
            jodr.type = :accountable
            `,
            { newUserId, accountable: AdditionalRecruiterTypes.Accountable }
          );
      })
      .update({ recruiter_id: newUserId, updated_at: date, updated_by: userLogId })
      .returning('jo.id');

    await trx
      .table('job_order_additional_recruiters as jodr')
      .where('jodr.recruiter_to_collaborate_id', oldUserId)
      .whereIn('jodr.job_order_id', joIds)
      .update({ recruiter_to_collaborate_id: newUserId, updated_at: date, updated_by: userLogId });

      
    await trx
      .table('job_order_additional_recruiters as jodr')
      .where('jodr.type', AdditionalRecruiterTypes.Collaborator)
      .where('jodr.recruiter_id', oldUserId)
      .delete();

    return {
      joIds
    }
  }

  async updateOwnerFreeGameItems(oldUserId, newUserId, date, userLogId, trx){
    const joIdsFreeGame = await trx
      .table('job_order_additional_recruiters as jodr')
      .where('jodr.type', AdditionalRecruiterTypes.Accountable)
      .where('jodr.recruiter_id', oldUserId)
      .whereNotExists((builder) => {
        builder.select('id')
          .from('job_orders as jo')
          .whereRaw('jo.id = jodr.job_order_id AND jo.recruiter_id = :newUserId', { newUserId });
      })
      .update({ recruiter_id: newUserId, updated_at: date, updated_by: userLogId })
      .returning('jodr.job_order_id');

    await trx
      .table('job_order_additional_recruiters as jodr')
      .where('jodr.recruiter_to_collaborate_id', oldUserId)
      .whereIn('jodr.job_order_id', joIdsFreeGame)
      .update({ recruiter_to_collaborate_id: newUserId, updated_at: date, updated_by: userLogId });
    
    return {
      joIdsFreeGame
    }
  }

  async updateStatus(id, statusId, trx = null){
    const jobOrder = await JobOrder.find(id);
    if (!jobOrder) {
      return;
    }
    jobOrder.merge({ status_id: statusId });
    await jobOrder.save(trx);
  }

  async updateType(id, typeId, trx = null){
    const whiteSheet = await WhiteSheetRepository.getByJobOrder(id);
    if (!whiteSheet) {
      return;
    }
    whiteSheet.merge({ job_order_type_id: typeId });
    await whiteSheet.save(trx);
  }

  /**
   * Evaluates if the job is an ongoing Search Assignment
   *
   * @method isAnOngoingItem
   *
   * @param {Integer} candidateId
   *
   * @return {Boolean}
   */
   async isAnOngoingItem(jobOrderId) {
    const jobOrder = await JobOrder.find(jobOrderId);
    const { status_id = null } = jobOrder;
    const whiteSheet = await WhiteSheetRepository.getByJobOrder(jobOrderId);
    const { job_order_type_id = null } = whiteSheet;
    return job_order_type_id == JobOrderTypeSchemes.SearchAssignment && status_id == JobOrderStatusSchemes.Ongoing
  }

  /**
   *
   * @param {Integer} jobOrderId
   * @returns basic info to sendout
   */
  async getJobOrderForSendout(jobOrderId) {
    const result = await Database.table('job_orders as jo')
    .select(['jo.id', 'jo.title', 'i.email as industry_email'])
    .innerJoin('specialties as s2', 'jo.specialty_id', 's2.id')
    .innerJoin('industries as i', 's2.industry_id', 'i.id')
    .where('jo.id', jobOrderId)
    .first();
    return result;
  }
}



module.exports = JobOrderRepository;
