'use strict';

// Utils
const appInsights = require('applicationinsights');

const { JobNames } = use('App/Scheduler/Constants');
const { SendoutTypesEmails, SendoutReminderType, SendoutEventType } = use('App/Helpers/Globals');

// Mail
const SendoutEmail = new (use('App/Emails/SendoutEmail'))();

// Models
const SendoutEventLog = use('App/Models/SendoutEventLog');

module.exports = (agenda) => {
  agenda.define(JobNames.Sendout.Reminder, async (job) => {
    try {
      const { sendoutId, payload, userId, diff } = job.attrs.data;

      await SendoutEmail.sendPersonalizedEmail(payload, SendoutTypesEmails.Sendout);

      let eventTypeId;

      if (SendoutReminderType.HiringAuthority === payload.type) {
        eventTypeId = SendoutEventType.ReminderEmailSentToHiringAuthority;
      } else if (SendoutReminderType.Candidate === payload.type && diff === 1) {
        eventTypeId = SendoutEventType.SecondReminderSentToCandidate;
      } else if (SendoutReminderType.Candidate === payload.type && diff === 24) {
        eventTypeId = SendoutEventType.FirstReminderSentToCandidate;
      } else if (SendoutReminderType.JobOrderRecruiter === payload.type) {
        eventTypeId = SendoutEventType.ReminderEmailSentToCandidateRecruiter;
      } else if (SendoutReminderType.CandidateRecruiter === payload.type) {
        eventTypeId = SendoutEventType.ReminderEmailSentToJobOrderRecruiter;
      } else {
        eventTypeId = SendoutEventType.InterviewRemindersSent;
      }

      const eventData = {
        sendout_id: sendoutId,
        triggered_by_user_id: userId,
        event_type_id: eventTypeId,
        event_details: payload
      }

      await SendoutEventLog.create(eventData);
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
    }
  });
};