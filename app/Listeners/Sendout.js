'use strict';

// Utils
const appInsights = require('applicationinsights');
const Agenda = use('Services/Agenda');
const { JobNames } = use('App/Scheduler/Constants');
const InstantMessagingService = new (use('App/Services/InstantMessagingService'))();
const { SendoutTypesSchemes } = use('App/Helpers/Globals');
// Models
const SendoutEventLog = use('App/Models/SendoutEventLog');

//Repositories
const CompanyRepository = new (use('App/Helpers/CompanyRepository'))();
const JobOrderRepository = new (use('App/Helpers/JobOrderRepository'))();
const CandidateRepository = new (use('App/Helpers/CandidateRepository'))();
const SendoutRepository = new (use('App/Helpers/SendoutRepository'))();


const Sendout = {
  RemindersCreated: async ({ sendoutId, payload, reminders, userId, eventTypeId }) => {
    try {
      for (const reminder of reminders) {
        await Agenda.create(JobNames.Sendout.Reminder, {
          sendoutId,
          interviewId: reminder.id,
          payload,
          date: reminder.date,
          userId,
          diff: reminder.diff
        })
          .schedule(reminder.date)
          .save();
      }

      const eventData = {
        sendout_id: sendoutId,
        triggered_by_user_id: userId,
        event_type_id: eventTypeId,
        event_details: { payload, reminders }
      };

      await SendoutEventLog.create(eventData);
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
    }
  },

  RemindersDeleted: async ({ sendoutId, userId }) => {
    try {
      await Agenda.cancel({
        name: JobNames.Sendout.Reminder,
        'data.sendoutId': sendoutId,
        'data.userId': userId,
      });
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
    }
  },

  ReminderDeletedById: async ({ interviewId, userId }) => {
    try {
      await Agenda.cancel({
        name: JobNames.Sendout.Reminder,
        'data.interviewId': interviewId,
        'data.userId': userId,
      });
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
    }
  },

  CreateActivityLogForCompany: async ({ payloadActivityLog }) => {
    try {
      const { logTypeId, companyId, sendoutId, userId } = payloadActivityLog;
      const message = await SendoutRepository.getMessageActivityLog(payloadActivityLog, sendoutId, userId);
      const optionalParams = { metadata: { id: companyId, sendoutId: sendoutId }, createdBySystem: true };
      await CompanyRepository.createActivityLog(message, logTypeId, companyId, userId, optionalParams);
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
    }
  },

  CreateActivityLogForJobOrder: async ({ payloadActivityLog }) => {
    try {
      const { logTypeId, jobOrderId, sendoutId, userId } = payloadActivityLog;
      const message = await SendoutRepository.getMessageActivityLog(payloadActivityLog, sendoutId, userId);
      const optionalParams = { metadata: { id: jobOrderId, sendoutId: sendoutId }, createdBySystem: true };
      await JobOrderRepository.createActivityLog(message, logTypeId, jobOrderId, userId, optionalParams);
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
    }
  },

  CreateActivityLogForCandidate: async ({ payloadActivityLog }) => {
    try {
      const { logTypeId, candidateId, sendoutId, userId } = payloadActivityLog;
      const message = await SendoutRepository.getMessageActivityLog(payloadActivityLog, sendoutId, userId);
      const optionalParams = { metadata: { id: candidateId, sendoutId: sendoutId }, createdBySystem: true };
      await CandidateRepository.createActivityLog(message, logTypeId, candidateId, userId, optionalParams);
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
    }
  },

  LogEventUpdate: async (eventData) => {
    try {
      await SendoutEventLog.create(eventData);
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
    }
  },

  SendGlipMessage: async ({ payloadActivityLog = {} }) => {
    const { sendoutId, typeId } = payloadActivityLog;

    try {
      if(typeId !== SendoutTypesSchemes.Sendout) return;

      if (!sendoutId) throw new Error(`Sendout Key Missing For : ${JSON.stringify(payloadActivityLog)}`);
      
      const configKeys = ['sendoutsGlipConfig'];
      const message = await SendoutRepository.getGlipMessage(sendoutId);
      message && (await InstantMessagingService.sendMessage({ configKeys, title: message, text: null }));
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
    }
  },
};

module.exports = Sendout;
