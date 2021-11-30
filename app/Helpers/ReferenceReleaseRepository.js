'use strict';

//Utils
const appInsights = require("applicationinsights");
const Database = use('Database');
const Event = use('Event');
const EventTypes = use('App/Helpers/Events');
const { isEmpty, isNil } = use('lodash');
const Antl = use('Antl');
const {
  EntityTypes,
  OperationType,
  userFields
} = use('App/Helpers/Globals');
const MicrosoftGraph = new (use('App/Helpers/MicrosoftGraph'))();

//Models
const ReferenceReleaseEmail = use('App/Models/ReferenceReleaseEmail');
const User = use('App/Models/User');

//Repositories
const ModulePresetsConfigRepository = new (use('App/Helpers/ModulePresetsConfigRepository'))();

class ReferenceReleaseRepository {
  async createAndSend(emailData, candidateId, userId) {
    let trx, eventPayload = {}, responseData = {};
    try {
      const {
        to,
        cc,
        bcc,
        subject,
      } = emailData;

      const user = await User.query().setVisibleHidden(['email_signature']).where({ id: userId }).first();
      const { email_signature } = user;
      const body = isNil(email_signature) ? emailData.body : emailData.body.concat(`<p>${email_signature}</p>`);

      const dataToCreate = {
        to,
        cc,
        bcc,
        subject,
        body,
        candidate_id: candidateId,
        created_by: userId,
        updated_by: userId,
      }

      trx = await Database.beginTransaction();
      const referenceRelease = await ReferenceReleaseEmail.create(dataToCreate, trx);

      const emailRes = await this.sendEmail(to, cc, bcc, subject, body, userId);
      if(!emailRes.success){
        trx && (await trx.rollback());
        responseData = emailRes;
        return;
      }
      await trx.commit();
      
      eventPayload = {
        referenceRelease,
        referenceReleaseId: referenceRelease.id,
        entity: EntityTypes.ReferenceRelease,
        payload: referenceRelease,
        operation: OperationType.Sent,
        candidateId: candidateId,
        lastSentReferenceDate: referenceRelease.created_at,
        userId
      };

      responseData = {
        success: true,
        message: Antl.formatMessage('messages.success.creation', { entity: 'Reference Release' }),
        data: referenceRelease,
        code: 201
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      trx && (await trx.rollback());

      eventPayload = {
        entity: EntityTypes.ReferenceRelease,
        payload: { exception: error.toString() },
        operation: OperationType.Sent,
        candidateId: candidateId,
        successful_operation: false,
        userId
      };

      responseData =  {
        success: false,
        code: 500,
        message: Antl.formatMessage('messages.error.internalServer', { action: 'sending', entity: 'reference release email' }),
      };
    }finally {
      !isEmpty(eventPayload) && Event.fire(EventTypes.Candidate.ReferenceReleaseCreated, eventPayload);
      return responseData;
    }
  }


  async getTemplateEmail(){
    try {
      const config = await ModulePresetsConfigRepository.getById('referenceRelease');
      const { email = '', subject } = config.data;
      const message =  email.trim().replace(/\r?\n|\r/g, "");
      return {
        success: true,
        code: 200,
        data: {
          message,
          subject
        },
      }
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
      return {
        success: false,
        code: 500,
        message: Antl.formatMessage('messages.error.internalServer', { action: 'getting', entity: 'reference release template' }),
      }
    }
  }

  async sendEmail(recipients = [], ccRecipients = [], bccRecipients = [], subject, content, userId){
    try {
      const body = {
        contentType: 'Html',
        content
      };
      const recipientData = {
        recipients,
        ccRecipients,
        bccRecipients
      };
      const messageData = {
        subject,
        body
      };
      const config = {
        saveToSentItems: 'true'
      };

      const resEmail = await MicrosoftGraph.sendEmail(recipientData, messageData, config, userId, {});
      if(!resEmail.success){
        const { success, message, code = null, statusCode = null } = resEmail;
        return {
          success,
          code: code || statusCode,
          message
        }
      }
      return {
        success: true
      }
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
      return {
        success: false,
        code: 500,
        message: error
      }
    }
  }

  async getByCandidate(candidateId){
    try {
      const referenceReleases = await ReferenceReleaseEmail.query()
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
        ]).where('candidate_id',candidateId)
        .orderBy('created_at','desc')
        .fetch();

      return {
        success: true,
        code: 200,
        data: referenceReleases,
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
      return {
        success: false,
        code: 500,
        message: Antl.formatMessage('messages.error.internalServer', { action: 'getting', entity: 'reference releases' }),
      }
    }
  }
}

module.exports = ReferenceReleaseRepository;
