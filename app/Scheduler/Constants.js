'use strict';

const JobNames = {
  Candidates: {
    OperatingMetrics: 'Candidate Operating Metrics',
    OperatingReminders: 'Candidate Operating Reminders',
    BeforeOperatingRenew: 'Candidate Operating Before To Renew',
    AccountabilityCheck: 'Candidate Accountability Check'
  },
  JobOrders: {
    OperatingMetrics: 'Job Order Operating Metrics',
    OperatingReminders: 'Job Order Operating Reminders',
    BeforeOperatingRenew: 'Job Order Operating Before To Renew',
    AccountabilityCheck: 'Job Order Accountability Check'
  },
  Emails: {
    SummaryFeeAgreementEmail: 'Daily Fee Agreement Summary Email',
    SummaryEmail: 'Daily Summary Email',
    ScheduledBulkEmail: 'Scheduled Bulk Email', //Remove later, easier finding the refactored events in the mongoDB
  },
  Migrations: {
    SearchProject: 'Search Project Migration',
    Company:'Company Migration',
    Contacts:'Contacts Migration',
    ProcessPending:'Process Pending Migrations',
    EmailValidation:'Migration Email Validation',
  },
  FeeAgreement: {
    ExpirationCheck: 'Fee Agreement Expiration Check',
    ExpirationReminder: 'Expiration Reminder'
  },
  Sendout: {
    Reminder: 'Sendout Interview Reminder'
  }
}

module.exports = {
  JobNames
};
