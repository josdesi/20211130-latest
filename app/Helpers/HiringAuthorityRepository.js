'use strict';

//Utils
const appInsights = require('applicationinsights');
const { hiringAuthorityStatus, DateFormats, joinStringForQueryUsage, activityLogTypes } = use('App/Helpers/Globals');
const moment = use('moment');
const {  copyFile, deleteServerFile } = use('App/Helpers/FileHelper');
const Event = use('Event');
const EventType = use('App/Helpers/Events')
const Database = use('Database');
const Antl = use('Antl');
const { batchInsert } = use('App/Helpers/QueryUtils');

//Models
const HiringAuthority = use('App/Models/HiringAuthority');
const { auditFields } = use('App/Helpers/Globals');
const Company = use('App/Models/Company');
const HiringAuthorityNote = use('App/Models/HiringAuthorityNote');
const HiringAuthorityFromName = use('App/Models/HiringAuthorityFromName');
const HiringAuthorityHasFile = use('App/Models/HiringAuthorityHasFile');
const HiringAuthorityHasCompany = use('App/Models/HiringAuthorityHasCompany');
const HiringAuthorityActivityLog = use('App/Models/HiringAuthorityActivityLog');
const Name = use('App/Models/Name');
const HiringAuthorityBulkActivityReference = use('App/Models/HiringAuthorityBulkActivityReference');

//Repositories
const nameRepository = new (use('App/Helpers/NameRepository'))();

class HiringAuthorityRepository {
  async create(data, transaction) {
    const currentTransaction = transaction ? transaction : await Database.beginTransaction();
    try {
      const hiringAuthority = await HiringAuthority.create(data, currentTransaction);
      if (!transaction) {
        await currentTransaction.commit();
      }
      await hiringAuthority.loadMany(['specialty', 'subspecialty', 'position', 'specialty.industry']);
      Event.fire(EventType.HiringAuthority.Created, {hiringAuthority});
      return {
        code: 201,
        success: true,
        data: hiringAuthority,
      };
    } catch (err) {
      if (!transaction) {
        await currentTransaction.rollback();
      }
      appInsights.defaultClient.trackException({ exception: err });
      return {
        code: 500,
        success: false,
        message: 'There was a problem creating the hiring authority, please try again later',
      };
    }
  }

  async createFromName(name_id, data, externalTransaction) {
    let transaction;
    try {
      let name = await Name.find(name_id);
      if (!name) {
        return {
          code: 404,
          success: false,
          message: `Name with id <${name_id}> not found`,
        };
      }

      if (!(await nameRepository.cancCreateHiringAuthorityFromName(name))) {
        return {
          success: false,
          code: 400,
          message: `A Hiring Authority from this contact already exist`,
        };
      }
      transaction = externalTransaction || await Database.beginTransaction();
      const personalInformationData = { first_name: data.first_name, last_name: data.last_name };
      const personalInformation = await name.personalInformation().fetch();
      personalInformation.merge(personalInformationData);
      personalInformation.save(transaction);

      const contactData = {
        phone: data.work_phone,
        ext: data.ext,
        mobile: data.personal_phone,
        personal_email: data.personal_email,
      };
      const contact = await personalInformation.contact().fetch();
      contact.merge(contactData);
      contact.save(transaction);

      data.hiring_authority_status_id = hiringAuthorityStatus.Inactive;
      const hiringAuthority = await HiringAuthority.create(data, transaction);
      await HiringAuthorityFromName.create({ name_id: name.id, hiring_authority_id: hiringAuthority.id }, transaction);


      name.title = data.title;
      name.convertion_date = moment().format(DateFormats.SystemDefault);

      await name.save(transaction);
      await this.copyDataFromName(name, hiringAuthority.id, transaction);
      
      !externalTransaction && await transaction.commit();
      await hiringAuthority.loadMany([
        'company',
        'specialty',
        'subspecialty',
        'position',
        'specialty.industry',
        'hiringAuthorityStatus'
      ]);
      Event.fire(EventType.Name.Converted, { name });
      Event.fire(EventType.HiringAuthority.Created, {hiringAuthority});
      return {
        success: true,
        code: 200,
        data: hiringAuthority,
      };
    } catch (error) {
      transaction && await transaction.rollback();
      appInsights.defaultClient.trackException({ exception: error });

      return {
        code: 500,
        success: false,
        message: 'There was a problem creating the hiring authority, please try again later',
      };
    }
  }

  async copyDataFromName(name, hiring_authority_id, trx) {
    const files = (await name.files().fetch()).rows;
    await Database.raw(
      `
        INSERT INTO hiring_authority_activity_logs (user_id, hiring_authority_id, body, activity_log_type_id, created_at, updated_at)
        SELECT user_id, ${hiring_authority_id} as hiring_authority_id, body, activity_log_type_id, created_at, updated_at FROM name_activity_logs WHERE name_id = ${name.id}
      `
    ).transacting(trx);

    await Database.raw(
      `
        INSERT INTO hiring_authority_notes(user_id, hiring_authority_id, body, title, created_at, updated_at)
        SELECT user_id, ${hiring_authority_id} as hiring_authority_id, body, title, created_at, updated_at FROM name_notes WHERE name_id = ${name.id}
      `
    ).transacting(trx);
    for (const file of files) {
      const destinationFileName = `Hiring Authority copy ${file.file_name}`;

      const fileCopyResult = await copyFile(file.url, 'attachments', destinationFileName);
      if (!fileCopyResult.success) {
        throw fileCopyResult.error;
      }
      const newFile = {
        hiring_authority_id: hiring_authority_id,
        file_type_id: file.file_type_id,
        file_name: destinationFileName,
        url: fileCopyResult.url,
      };
      await HiringAuthorityHasFile.create(newFile, trx);
    }
  }

  async update(id, data, externalTransaction) {
    const transaction = externalTransaction ? externalTransaction : await Database.beginTransaction();
    const isAtomic = transaction && !externalTransaction;
    try {
      const hiringAuthority = await HiringAuthority.find(id);
      if (!hiringAuthority) {
        return {
          code: 404,
          success: false,
          message: 'Hiring Authority not found',
        };
      }
      hiringAuthority.merge(data);
      await hiringAuthority.save(transaction);
      isAtomic && (await transaction.commit());
      Event.fire(EventType.HiringAuthority.Updated, {hiringAuthority});
      return {
        code: 200,
        success: true,
        data: await this.findWithAll(id),
      };
    } catch (error) {
      isAtomic && (await transaction.rollback());
      appInsights.defaultClient.trackException({ exception: error });
      
      return {
        code: 500,
        success: false,
        message: 'There was a problem updating the hiring authority, please try again later',
      };
    }
  }

  async findWithAll(id) {
    const result = await HiringAuthority.query()
      .with('specialty', (builder) => {
        builder.select(['id', 'title']);
      })
      .with('subspecialty', (builder) => {
        builder.select(['id', 'title']);
      })
      .with('position', (builder) => {
        builder.select(['id', 'title']);
      })
      .with('specialty.industry')
      .with('notes')
      .with('notes.user')
      .with('files')
      .with('activityLogs')
      .with('activityLogs.bulkReference')
      .with('activityLogs.user')
      .with('activityLogs.activityLogType')
      .with('company')
      .with('hiringAuthorityStatus')
      .where('id', id)
      .first();
    return result;
  }

  async isHiringAuthorityAssignedToCompany(hiringAuthorityId, companyId) {
    const isAssigned =
      (await HiringAuthorityHasCompany.query()
        .where('company_id', companyId)
        .where('hiring_authority_id', hiringAuthorityId)
        .first()) ||
      (await HiringAuthority.query().where('id', hiringAuthorityId).where('company_id', companyId).first());

    return !!isAssigned;
  }

  async getHiringAuthorityFromCompany(hiringAuthorityId, companyId) {
    const hiringAuthority =
      (await HiringAuthorityHasCompany.query()
        .where('company_id', companyId)
        .where('hiring_authority_id', hiringAuthorityId)
        .first()) ||
      (await HiringAuthority.query().where('id', hiringAuthorityId).where('company_id', companyId).first());

    return hiringAuthority;
  }


    /**
   * Returns a custom response that determines
   * the creation of a note
   *
   * @method createNote
   *
   * @param {String} body
   * @param {String} title
   * @param {Integer} hiringAuthorityId
   * @param {Integer} userId
   *
   * @return {Object} A success with a code 201 and the note created or an error code
   *
   */
     async createNote(body, title, hiringAuthorityId, userId) {
      const hiringAuthority = await HiringAuthority.find(hiringAuthorityId);
      if (!hiringAuthority) {
        return {
          success: false,
          code: 404,
          message: 'Hiring Authority not found',
        };
      }
      try {
        const hiringAuthorityNote = await HiringAuthorityNote.create({
          body,
          title,
          user_id: userId,
          hiring_authority_id: hiringAuthorityId,
        });
        await hiringAuthorityNote.load('user', (builder) => {
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
          data: hiringAuthorityNote,
        };
      } catch (error) {
        appInsights.defaultClient.trackException({ exception: error });
  
        return {
          success: false,
          code: 500,
          message: 'There was a problem creating the Hiring Authority note, please try again later',
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
   * @param {Integer} hiringAuthorityId
   * @param {Integer} userId
   *
   * @return {Object} A success with a code 201 and the note updated or an error code
   *
   */
  async updateNote(body, title, noteId, hiringAuthorityId, userId) {
    const hiringAuthorityNote = await HiringAuthorityNote.query().where('id', noteId).where('hiring_authority_id', hiringAuthorityId).first();
    if (!hiringAuthorityNote) {
      return {
        success: false,
        code: 404,
        message: 'Note not found',
      };
    }
    if (hiringAuthorityNote.user_id != userId) {
      return {
        success: false,
        code: 403,
        isInactive: false,
        redirect: false,
        message: "You don't have the permission required to use the resource",
      };
    }
    try {
      await hiringAuthorityNote.merge({ body, title });
      await hiringAuthorityNote.save();
      /*
      Event.fire(EventTypes.Candidate.NoteUpdated, {
        hiringAuthorityId,
        entity: EntityTypes.Note,
        operation: OperationType.Update,
        payload: hiringAuthorityNote,
        userId,
      });
    */
      await hiringAuthorityNote.load('user', (builder) => {
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
        data: hiringAuthorityNote,
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      return {
        success: false,
        code: 500,
        message: 'There was a problem updating the Hiring Authority note, please try again later',
      };
    }
  }

  async deleteFile(candidateId, fileId, userId) {
    try {
      const hiringAuthorityFile = await HiringAuthorityHasFile.query()
        .where('id', fileId)
        .where('hiring_authority_id', candidateId)
        .first();

      if (!hiringAuthorityFile) {
        return {
          code: 404,
          success: false,
          message: 'File not found',
        };
      }
      await deleteServerFile(hiringAuthorityFile.url);
      await hiringAuthorityFile.delete();

      /*Event.fire(EventTypes.Candidate.FileDeleted, {
        candidateId: candidate.id,
        entity: EntityTypes.File,
        operation: OperationType.Delete,
        payload: candidateFile,
        userId,
      });*/

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
   * Return an array of hiring authorities
   *
   * @param {Object[]} HiringAuthorities
   */
  async getHiringByIds(hiringIds) {
    const hirings = (await HiringAuthority.query()
      .select([
        'hiring_authorities.id',
        'hiring_authorities.work_email as email',
        'hiring_authorities.full_name',
        'hiring_authorities.company_id',
        'spec.title as specialty',
        'sub.title as subspecialty',
      ])
      .leftJoin('specialties as spec', 'hiring_authorities.specialty_id', 'spec.id')
      .leftJoin('subspecialties as sub', 'sub.id', 'hiring_authorities.subspecialty_id')
      .whereIn('hiring_authorities.id', hiringIds)
      .fetch()).toJSON();

    return hirings;
  }

  /*
     * Returns a custom response that determines
   * the delete of a note
   *
   * @method deleteNote
   *
   * @param {Integer} noteId
   * @param {Integer} hiringAuthorityId
   * @param {Integer} userId
   *
   * @return {Object} A success with a code 200  or an error code
   *
   */
  async deleteNote(noteId, hiringAuthorityId, userId) {
    const hiringAuthorityNote = await HiringAuthorityNote.query().where('id', noteId).where('hiring_authority_id', hiringAuthorityId).first();
    if (!hiringAuthorityNote) {
      return {
        success: false,
        code: 404,
        message: 'Note not found',
      };
    }
    if (hiringAuthorityNote.user_id != userId) {
      return {
        success: false,
        code: 403,
        isInactive: false,
        redirect: false,
        message: "You don't have the permission required to use the resource",
      };
    }
    try {
      await hiringAuthorityNote.delete();

     /* Event.fire(EventTypes.Candidate.NoteDeleted, {
        candidateId,
        entity: EntityTypes.Note,
        operation: OperationType.Delete,
        payload: hiringAuthorityNote,
        userId,
      });*/

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
   * Creates a batch of activities using the activityData
   *
   * @summart This method is expected to be called from other part of the system that creates many activities, while not necessary, usually sharing the same values
   *
   * @method createActivityLog
   *
   * @param {Object[]} activityData - An array of objects containing each one the activity info
   * @param {String} activityData[].body - The activity body
   * @param {Number} activityData[].activity_log_type_id - The activity log type id
   * @param {Number} activityData[].hiring_authority_id - The activity hiring authority
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
      const activitiesCreated = await batchInsert(HiringAuthorityActivityLog, activityDataWithRecruiter, trx);

      const hiringAuthorityIds = activityData.map(({ hiring_authority_id }) => hiring_authority_id);

      if (!externalTrx) await trx.commit();

      Event.fire(EventType.HiringAuthority.BatchActivityCreated, { hiringAuthorityIds });

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
          entity: 'batch hiring authorities activities',
        }),
      };
    }
  }

  async refreshLastActivityDateTableByBatchIds(hiringAuthorityIds) {
    try {
      await Database.raw(
        `INSERT INTO
        hiring_authority_last_activity_logs (
          hiring_authority_id,
          user_id,
          hiring_authority_activity_log_id,
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
        DISTINCT on (hiring_authority_id) act.hiring_authority_id,
        act.user_id,
        act.id as hiring_authority_activity_log_id,
        act.activity_log_type_id,
        act.body,
        act.created_at,
        act.updated_at,
        act.created_by_system,
        act.metadata,
        act_types.title,
        v_users.user_name
      from
        hiring_authority_activity_logs as act
        inner join activity_log_types as act_types on act.activity_log_type_id = act_types.id
        inner join v_users on act.user_id = v_users.id
      where
        act.hiring_authority_id in ${joinStringForQueryUsage(hiringAuthorityIds)}
      order by
        hiring_authority_id desc,
        created_at desc 
      ON CONFLICT (hiring_authority_id) DO
      UPDATE
      SET
        hiring_authority_id = excluded.hiring_authority_id,
        user_id = excluded.user_id,
        hiring_authority_activity_log_id = excluded.hiring_authority_activity_log_id,
        activity_log_type_id = excluded.activity_log_type_id,
        body = excluded.body,
        created_at = excluded.created_at,
        updated_at = excluded.updated_at,
        created_by_system = excluded.created_by_system,
        metadata = excluded.metadata,
        title = excluded.title,
        user_name = excluded.user_name
      WHERE
        hiring_authority_last_activity_logs.hiring_authority_id = excluded.hiring_authority_id;`
      );
      return { success: true };
    } catch (error) {
      return { success: false, error };
    }
  }

  async refreshLastActivityDateTableById(hiringAuthorityId) {
    try {
      await Database.raw(
        `INSERT INTO
        hiring_authority_last_activity_logs (
          hiring_authority_id,
          user_id,
          hiring_authority_activity_log_id,
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
        DISTINCT on (hiring_authority_id) act.hiring_authority_id,
        act.user_id,
        act.id as hiring_authority_activity_log_id,
        act.activity_log_type_id,
        act.body,
        act.created_at,
        act.updated_at,
        act.created_by_system,
        act.metadata,
        act_types.title,
        pi.full_name as user_name
      from
        hiring_authority_activity_logs as act
        inner join activity_log_types as act_types on act.activity_log_type_id = act_types.id
        inner join users on act.user_id = users.id
        inner join personal_informations as pi on users.personal_information_id = pi.id
      where
        act.hiring_authority_id = :hiringAuthorityId
      order by
        hiring_authority_id desc,
        created_at desc 
      ON CONFLICT (hiring_authority_id) DO
      UPDATE
      SET
        hiring_authority_id = excluded.hiring_authority_id,
        user_id = excluded.user_id,
        hiring_authority_activity_log_id = excluded.hiring_authority_activity_log_id,
        activity_log_type_id = excluded.activity_log_type_id,
        body = excluded.body,
        created_at = excluded.created_at,
        updated_at = excluded.updated_at,
        created_by_system = excluded.created_by_system,
        metadata = excluded.metadata,
        title = excluded.title,
        user_name = excluded.user_name
      WHERE
        hiring_authority_last_activity_logs.hiring_authority_id = :hiringAuthorityId`,
        { hiringAuthorityId }
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
   * @param {Integer} activityLogTypeId
   * @param {Integer} hiringAuthorityId
   * @param {Integer} userId
   * @param {Object} optionalParams - An object that contains optional/extra params, trying not to put too many unnecessaries params
   *
   * @return {Object} A success with a code 201 and the activity  or an error code
   *
   */
   async createActivityLog(body, activityLogTypeId, hiringAuthorityId, userId, optionalParams = {}) {
    const hiringAuthority = await HiringAuthority.find(hiringAuthorityId);
    if (!hiringAuthority) {
      return {
        success: false,
        code: 404,
        message: 'Hiring Authority not found',
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

      const hiringAuthorityActivityLog = await HiringAuthorityActivityLog.create({
        body,
        user_id: userId,
        activity_log_type_id: activityLogTypeId,
        hiring_authority_id: hiringAuthorityId,
        created_by_system: createdBySystem,
        metadata,
      }, trx);
      
      if(!externalTrx) {
        await trx.commit();
      }

      // FOR UPDATING DATE IF IT'S AN ACT LOG FROM RC API
      if(dateUpdated){
        const formattedDate = moment(dateUpdated || undefined).format();
        await Database.table('hiring_authority_activity_logs')
          .where('id', hiringAuthorityActivityLog.id)
          .update({ created_at: formattedDate });
      }

      await hiringAuthorityActivityLog.loadMany({
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

      Event.fire(EventType.HiringAuthority.ActivityCreated, { hiringAuthorityId });

      const result = hiringAuthorityActivityLog.toJSON();
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

      if(activityLogTypeId === activityLogTypes.Call || activityLogTypeId === activityLogTypes.SMS){
        appInsights.defaultClient.trackEvent({
          name: 'Invalid phone act log',
          properties: { hiringAuthorityId, userId, metadata, dateUpdated }
        });
      }

      appInsights.defaultClient.trackException({ exception: error });

      return {
        success: false,
        code: 500,
        message: 'There was a problem creating the Hiring Authority activity, please try again later',
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
   * @param {Integer} hiringAuthorityId
   * @param {Integer} userId
   *
   * @return {Object} A success with a code 201 and the activity  or an error code
   *
   */
     async updateActivityLog(body, activityLogId, hiringAuthorityId, userId) {
      const hiringAuthorityActivityLog = await HiringAuthorityActivityLog.query()
        .where('id', activityLogId)
        .where('hiring_authority_id', hiringAuthorityId)
        .first();
      if (!hiringAuthorityActivityLog) {
        return {
          success: false,
          code: 404,
          message: 'ActivityLog not found',
        };
      }
      if (hiringAuthorityActivityLog.user_id != userId) {
        return {
          success: false,
          code: 403,
          isInactive: false,
          redirect: false,
          message: "You don't have the permission required to use the resource",
        };
      }
      if (hiringAuthorityActivityLog.created_by_system) {
        return {
          success: false,
          code: 409,
          message: Antl.formatMessage('messages.error.activityFromSystem'),
        };
      }
      try {
        await hiringAuthorityActivityLog.merge({ body });
        await hiringAuthorityActivityLog.save();
  
        Event.fire(EventType.HiringAuthority.ActivityUpdated, { hiringAuthorityId });
  
        await hiringAuthorityActivityLog.loadMany({
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
          data: hiringAuthorityActivityLog,
        };
      } catch (error) {
        appInsights.defaultClient.trackException({ exception: error });
  
        return {
          success: false,
          code: 500,
          message: 'There was a problem updating the Hiring Authority activity, please try again later',
        };
      }
    }


     /**
   * Returns a custom response that determines
   * the deletd of an activity
   *
   * @method deleteActivityLog
   *
   * @param {Integer} activityLogId
   * @param {Integer} hiringAuthorityId
   * @param {Integer} userId
   *
   * @return {Object} A success with a code 200  or an error code
   *
   */
  async deleteActivityLog(activityLogId, hiringAuthorityId, userId) {
    const hiringAuthorityActivityLog = await HiringAuthorityActivityLog.query()
      .where('id', activityLogId)
      .where('hiring_authority_id', hiringAuthorityId)
      .first();
    if (!hiringAuthorityActivityLog) {
      return {
        success: false,
        code: 404,
        message: 'ActivityLog not found',
      };
    }
    if (hiringAuthorityActivityLog.user_id != userId) {
      return {
        success: false,
        code: 403,
        isInactive: false,
        redirect: false,
        message: "You don't have the permission required to use the resource",
      };
    }
    if (hiringAuthorityActivityLog.created_by_system) {
      return {
        success: false,
        code: 409,
        message: Antl.formatMessage('messages.error.activityFromSystem'),
      };
    }
    try {
      await hiringAuthorityActivityLog.delete();

      Event.fire(EventType.HiringAuthority.ActivityDeleted, { hiringAuthorityId });

      return {
        success: true,
        code: 200,
        message: 'The activity log was deleted successfully!',
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      return {
        success: false,
        code: 500,
        message: 'There was a problem deleting the Hiring Authority activity, please try again later',
      };
    } 
  }
}

module.exports = HiringAuthorityRepository;
