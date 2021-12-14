'use strict';

//Models
const EmailBody = use('App/Models/EmailBody');
const EmailHistory = use('App/Models/EmailHistory');
const ScheduledEmail = use('App/Models/ScheduledEmail');
const BulkEmailMarketingCandidate = use('App/Models/BulkEmailMarketingCandidate');
const BulkEmailRecruitingJobOrder = use('App/Models/BulkEmailRecruitingJobOrder');

//Repositories
const BulkEmailRepository = new (use('App/Helpers/BulkEmailRepository'))();

//Utils
const appInsights = require('applicationinsights');
const Database = use('Database');
const {  deleteServerFile } = use('App/Helpers/FileHelper');
const Event = use('Event');
const EventTypes = use('App/Helpers/Events');
const moment = use('moment');

class BulkEmailScheduleRepository {
  /**
   * Show a list of scheduled bulk emails
   *
   * @param {Object} { keyword, page, perPage }
   * @param {String} user_id
   *
   * @return {Object} Schedules Bulk email list with a succes message or an error code
   *
   */
  async listing({ keyword, page, perPage }, user_id) {
    try {
      const scheduledEmails = EmailHistory.query()
        .select('email_histories.*')
        .with('scheduledEmail')
        .whereHas('scheduledEmail', (builder) => builder.where('created_by', user_id))
        .with('emailBody')
        .whereHas('emailBody', (builder) => {
          if (keyword) {
            builder.where('subject', 'ilike', `%${keyword}%`);
          }
        })
        .leftJoin('scheduled_emails', 'scheduled_emails.email_history_id', 'email_histories.id')
        .with('emailBody.attachments')
        .where('email_histories.is_sent', false)
        .where('email_histories.created_by', user_id)
        .orderBy('scheduled_emails.send_date', 'desc');

      const result = await scheduledEmails.paginate(page ? page : 1, perPage ? perPage : 10);

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
        message: 'There was a problem while retrieving the scheduled bulk emails history',
      };
    }
  }

  /**
   * Create the bulk email schedule
   *
   * @summary This method contains the upper logic of calling: the validations, creating the neccesary models for the bulk & scheduling it
   *
   * @param {Object} emailData - Check out @method createAndSend in the @class BulkEmailRepository for more information on this object
   * @param {Number} userId - Who is sending the bulk email
   * @param {Number[]} candidateIds - The candidates which are being market-ed, usually only passed when the email has a marketing scope
   * @param {Number[]} jobOrderIds - The job orders which are being used for recruiting purposes, usually only passed when the email has a recruiting scope
   *
   * @return {Object} bulk email created
   */
  async create(emailData, userId, candidateIds = [], jobOrderIds = []) {
    let trx;
    try {
      const bulkValidation = await BulkEmailRepository.validateBulk(emailData, userId, candidateIds, jobOrderIds);
      if (!bulkValidation.success) return bulkValidation;

      const trx = await Database.beginTransaction();

      emailData.is_draft = true; //This allows to create the is_sent as false

      const searchProjectSelection = BulkEmailRepository.getSearchProjectSelectionJSON(emailData);

      const bulkConfiguration = { candidateIds, jobOrderIds, searchProjectSelection };
      const bulkData = await BulkEmailRepository.createBulk(emailData, userId, bulkConfiguration, trx);
      const { emailBody, emailHistory, attachments } = bulkData;

      const scheduledEmail = await this.createSchedule(emailData, emailHistory, userId, trx);

      await trx.commit();

      const result = emailHistory;
      emailHistory.scheduledEmail = scheduledEmail;
      emailBody.attachments = attachments;
      result.emailBody = emailBody;

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
        message: 'There was a problem while creating the bulk email',
      };
    }
  }

  /**
   * This methods creates the neccesary model for the scheduling & schedules the bulk
   *
   * @summary This methods schedules a bulk email to be sent at a later date
   *
   * @param {Object} emailData - Check out @method createAndSend in the @class BulkEmailRepository for more information on this object
   * @param {Database.model} emailHistory - The EmailHistory model, This method requires the database object, DO NOT JSON()'d IT BEFORE PASSING IT HERE
   * @param {Number} userId - Who is sending the bulk email
   * @param {Database} trx - External transaction object, the transaction should be controlled out side this method, since this method could be part of a bigger scope
   *
   * @return {Object} bulk email scheduled
   */
  async createSchedule(emailData, emailHistory, userId, trx) {
    const sendDate = emailData.send_date;
    const emailHistoryId = emailHistory.id;

    const scheduledEmail = await ScheduledEmail.create(
      {
        created_by: userId,
        send_date: sendDate,
        email_history_id: emailHistoryId,
      },
      trx
    );

    Event.fire(EventTypes.BulkEmail.ScheduleCreated, {
      date: sendDate,
      bulkEmailId: emailHistoryId,
      userId: userId,
    });

    return scheduledEmail;
  }

  /**
   * Send a scheduled email
   *
   * @param {Number} bulkEmailId
   * @summary This method should be used only from the BulkEmail job,
   *  while it can be used from anywhere, only the scheduled task from agenda should interact with this method
   *
   * @return {Object} sent bulk email
   *
   */
  async send(bulkEmailId, userId) {
    const trx = await Database.beginTransaction();
    try {
      const emailHistory = await EmailHistory.query()
        .with('emailBody')
        .with('emailBody.attachments')
        .with('marketingCandidates')
        .with('recruitingJobOrder')
        .where('id', bulkEmailId)
        .where('is_sent', false)
        .first();

      if (!emailHistory) {
        await trx.rollback();
        appInsights.defaultClient.trackException({
          exception: `Something went wrong when sending a scheduled email: The emailHistory does not exists anymore: ${bulkEmailId}`,
        });
        return {
          success: false,
          code: 404,
          message: 'Scheduled email not found',
        };
      }

      const emailBody = await emailHistory.getRelated('emailBody');
      const attachments = (await emailBody.getRelated('attachments')).toJSON();
      const marketingCandidates = await emailHistory.getRelated('marketingCandidates');
      const recruitingJobOrders = await emailHistory.getRelated('recruitingJobOrder');
      const candidateIds = marketingCandidates ? marketingCandidates.toJSON().map((row) => row.id) : [];
      const jobOrderIds = recruitingJobOrders ? recruitingJobOrders.toJSON().map((row) => row.id) : [];

      const blockedByResendItems = null; //TODO: Get this variable from getBlockResendValidation
      const searchProjectSelectionParams = {}; //TODO: Add support for SP selection for scheduled bulks
      const searchProjectSelectionCandidateIds = [];
      const searchProjectSelectionHiringAuthorityIds = [];
      const searchProjectSelectionNameIds = [];

      const bulkConfiguration = {
        candidateIds,
        jobOrderIds,
        blockedByResendItems,
        searchProjectSelection: {
          params: searchProjectSelectionParams,
          candidateIds: searchProjectSelectionCandidateIds,
          hiringAuthorityIds: searchProjectSelectionHiringAuthorityIds,
          nameIds: searchProjectSelectionNameIds,
        },
      };
      const bulkData = { emailBody, emailHistory, attachments };
      const sentData = await BulkEmailRepository.sendBulk(userId, bulkConfiguration, bulkData, trx);
      if (!sentData.success) return sentData;

      await trx.commit();

      const result = sentData.emailHistory;
      emailBody.attachments = attachments;
      result.emailBody = emailBody;

      return {
        success: true,
        code: 201,
        data: result,
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      await trx.rollback();
      return {
        success: false,
        code: 500,
        message: 'There was a problem when sending a scheduled bulk email',
      };
    }
  }

  /**
   * Show a one specific scheduled bulk email
   *
   * @param {Number} (scheduledEmail) id
   * @param {String} user_id
   *
   * @return {Object} scheduled bulk email with a succes message or an error code
   *
   */
  async details(id, user_id) {
    try {
      const scheduledEmail = await EmailHistory.query()
        .with('scheduledEmail')
        .whereHas('scheduledEmail', (builder) => builder.where('created_by', user_id))
        .with('emailBody')
        .has('emailBody')
        .with('emailBody.attachments')
        .where('email_histories.is_sent', false)
        .where('email_histories.id', id)
        .where('email_histories.created_by', user_id)
        .first();

      if (!scheduledEmail) {
        return {
          success: false,
          code: 404,
          message: 'Scheduled email not found',
        };
      }

      const result = scheduledEmail;

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
        message: 'There was a problem when retrieving the scheduled bulk email',
      };
    }
  }

  /**
   * Update the body of one scheduled bulk email
   *
   * @param {Number} (scheduledEmail) id
   * @param {Object} emailData = {search_project_id, block_resend, block_duration_days}
   * @param {Object} emailBodyData = {subject, text, html}
   * @param {Array} files
   * @param {Number} user_id
   *
   * @return {Object} Scheduled bulk email new details with a succes message or an error code
   *
   */
  async update(id, emailData, emailBodyData, files, user_id) {
    const trx = await Database.beginTransaction();

    try {
      const scheduledEmail = await EmailHistory.query()
        .with('scheduledEmail')
        .whereHas('scheduledEmail', (builder) => builder.where('created_by', user_id))
        .with('emailBody')
        .has('emailBody')
        .with('emailBody.attachments')
        .where('email_histories.id', id)
        .where('email_histories.is_sent', false)
        .where('email_histories.created_by', user_id)
        .first();

      if (!scheduledEmail) {
        return {
          success: false,
          code: 404,
          message: 'Scheduled email not found',
        };
      }

      if (emailData.search_project_id) {
        const searchProject = await BulkEmailRepository.findSearchProject(emailData.search_project_id, user_id);
        if (!searchProject) {
          trx.rollback();
          return {
            success: false,
            code: 404,
            message: 'Search project not found',
          };
        }
      }

      const attachments = await BulkEmailRepository.storeAttachmentsFromFiles(
        files,
        user_id,
        scheduledEmail.getRelated('emailBody').id,
        trx
      );

      await scheduledEmail.merge(emailData, trx);
      await scheduledEmail.save(trx);

      await scheduledEmail.getRelated('emailBody').merge(emailBodyData, trx);
      await scheduledEmail.getRelated('emailBody').save(trx);

      const result = scheduledEmail.toJSON();
      result.emailBody.attachments.push(...attachments);

      await trx.commit();
      return {
        success: true,
        code: 200,
        data: result,
      };
    } catch (error) {
      trx.rollback();
      appInsights.defaultClient.trackException({ exception: error });
      return {
        success: false,
        code: 500,
        message: 'There was a problem when updating the scheduled email',
      };
    }
  }

  /**
   * Update the send date of one scheduled email
   *
   * @param {Number} (scheduledEmail) id
   * @param {Object} { send_date }
   * @param {Number} user_id
   *
   * @return {Object} Scheduled bulk email new details with a succes message or an error code
   *
   */
  async updateSendDate(id, { send_date }, user_id) {
    try {
      const emailHistory = await EmailHistory.query()
        .with('scheduledEmail')
        .whereHas('scheduledEmail', (builder) => builder.where('created_by', user_id))
        .with('emailBody')
        .has('emailBody')
        .with('emailBody.attachments')
        .where('email_histories.id', id)
        .where('email_histories.is_sent', false)
        .where('email_histories.created_by', user_id)
        .first();

      if (!emailHistory) {
        return {
          success: false,
          code: 404,
          message: 'Scheduled email not found',
        };
      }

      if (emailHistory.block_resend) {
        const scheduleBlockResendValidation = await this.validateScheduleBlockResend(emailHistory, send_date);
        if (!scheduleBlockResendValidation.success) return scheduleBlockResendValidation;
      }

      const scheduledEmail = await emailHistory.getRelated('scheduledEmail');
      scheduledEmail.merge({ send_date });
      await scheduledEmail.save();

      Event.fire(EventTypes.BulkEmail.ScheduleUpdated, {
        date: send_date,
        bulkEmailId: emailHistory.id,
        userId: user_id,
      });

      const result = emailHistory.toJSON();

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
        message: 'There was a problem when updating the send date of one scheduled email',
      };
    }
  }

  async validateScheduleBlockResend(emailHistory, sendDate) {
    const useBlockResend = emailHistory.block_resend ? emailHistory.block_resend : false;
    const blockDurationDays = Number(emailHistory.block_duration_days) ? Number(emailHistory.block_duration_days) : 0;
    const blockDateStart = moment(sendDate).subtract(blockDurationDays, 'days').format();
    const blockResendObject = {
      useBlockResend,
      blockDateStart,
      blockDateEnd: sendDate,
    };

    const isBlocked = await BulkEmailRepository.getBlockResendValidation(
      emailHistory.search_project_id,
      emailHistory.email_template_id,
      blockResendObject,
      emailHistory.id
    );

    if (!isBlocked.success) return isBlocked;

    return { success: true };
  }

  /**
   * Delete one of the own bulk email drafts attachments
   *
   * @param {Number} (scheduledEmail) id
   * @param {Object} { attachment_id }
   * @param {Number} user_id
   *
   * @return {Object} Atachment details that was deleted with a succes message or an error code
   *
   */
  async destroyAttachment(id, { attachment_id }, user_id) {
    const trx = await Database.beginTransaction();
    try {
      const scheduledEmail = await EmailHistory.query()
        .with('scheduledEmail')
        .whereHas('scheduledEmail', (builder) => builder.where('created_by', user_id))
        .with('emailBody')
        .has('emailBody')
        .with('emailBody.attachments')
        .where('email_histories.id', id)
        .where('email_histories.is_sent', false)
        .where('email_histories.created_by', user_id)
        .first();

      if (!scheduledEmail) {
        trx.rollback();
        return {
          success: false,
          code: 404,
          message: 'Scheduled email not found',
        };
      }

      const attachments = await (await scheduledEmail.getRelated('emailBody')).getRelated('attachments');

      const attachment = attachments.rows.find((row) => row.id === attachment_id);

      if (!attachment) {
        trx.rollback();
        return {
          success: false,
          code: 404,
          message: 'Attachment not found',
        };
      }

      await deleteServerFile(attachment.url);
      await attachment.delete(trx);

      const result = attachment;

      await trx.commit();
      return {
        success: true,
        code: 200,
        data: result,
      };
    } catch (error) {
      await trx.rollback();
      appInsights.defaultClient.trackException({ exception: error });
      return {
        success: false,
        code: 500,
        message: 'There was a problem when deleting the attachment',
      };
    }
  }

  /**
   * Delete one scheduled email that has not been sent
   *
   * @param {Number} (scheduledEmail) id
   * @param {Number} user_id
   *
   * @return {Object} Scheduled email deleted with a succes message or an error code
   *
   */
  async destroy(id, user_id) {
    const trx = await Database.beginTransaction();

    try {
      const emailHistory = await EmailHistory.query()
        .with('scheduledEmail')
        .whereHas('scheduledEmail', (builder) => builder.where('created_by', user_id))
        .with('emailBody')
        .has('emailBody')
        .with('emailBody.attachments')
        .where('email_histories.id', id)
        .where('email_histories.is_sent', false)
        .where('email_histories.created_by', user_id)
        .first();
      if (!emailHistory) {
        return {
          success: false,
          code: 404,
          message: 'Scheduled email not found',
        };
      }

      const scheduledEmail = await emailHistory.getRelated('scheduledEmail');
      const emailBody = await emailHistory.getRelated('emailBody');

      await BulkEmailMarketingCandidate.query().transacting(trx).where('email_history_id', emailHistory.id).delete();
      await BulkEmailRecruitingJobOrder.query().transacting(trx).where('email_history_id', emailHistory.id).delete();
      await ScheduledEmail.query().transacting(trx).where('email_history_id', emailHistory.id).delete();
      await EmailHistory.query().transacting(trx).where('id', emailHistory.id).delete();
      await EmailBody.query().transacting(trx).where('id', emailBody.id).delete();

      const attachments = await (await emailHistory.getRelated('emailBody')).getRelated('attachments');
      for (const attachment of attachments.rows) {
        await deleteServerFile(attachment.url);
        await attachment.delete();
      }

      Event.fire(EventTypes.BulkEmail.ScheduleDeleted, {
        date: scheduledEmail.send_date,
        bulkEmailId: emailHistory.id,
        userId: user_id,
      });

      const result = emailHistory.toJSON();

      await trx.commit();
      return {
        success: true,
        code: 200,
        data: result,
      };
    } catch (error) {
      await trx.rollback();
      appInsights.defaultClient.trackException({ exception: error });
      return {
        success: false,
        code: 500,
        message: 'There was a problem when deleting a scheduled email',
      };
    }
  }

  /**
   * Return the where clause to apply on the query.
   * GET where clause
   *
   */
  applyKeywordClause(keyword, query, field) {
    if (keyword) {
      query.where(field, 'ilike', `%${keyword}%`);
    }
  }
}

module.exports = BulkEmailScheduleRepository;
