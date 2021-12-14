'use strict';

/** @type {import('@adonisjs/framework/src/Env')} */
const Env = use('Env');
const { JobNames } = use('App/Scheduler/Constants');

module.exports = {
  inventory: {
    enable: Env.get('DB_AGENDA_CONNECTION', ''),
    connection: {
      db: {
        address: Env.get('DB_AGENDA_CONNECTION'),
        options: {
          useUnifiedTopology: true,
        },
        collection: Env.get('DB_AGENDA_COLLECTION'),
      },
    },
    jobsToProcess: Env.get('DB_AGENDA_JOBS', ''),
    singleTasks: [
      { frequency: Env.get('ACCOUNTABILITY_JOB_FREQUENCY'), name: JobNames.Candidates.AccountabilityCheck, data: null },
      { frequency: Env.get('ACCOUNTABILITY_JOB_FREQUENCY'), name: JobNames.JobOrders.AccountabilityCheck, data: null },
      { frequency: Env.get('PROCESS_PENDING_MIGRATION_FREQUENCY','1 hour'), name: JobNames.Migrations.ProcessPending, data: null },
      { frequency: Env.get('FEE_AGREEMENT_EXPIRATION_CHECK_JOB_FREQUENCY', ''), name: JobNames.FeeAgreement.ExpirationCheck, data: null },
      { frequency: Env.get('FEE_AGREEMENT_EXPIRATION_CHECK_JOB_FREQUENCY', ''), name: JobNames.FeeAgreement.ExpirationReminder, data: null }
    ],
  },
  activity: {
    enable: Env.get('DB_AGENDA_CONNECTION_ACTIVITY', ''),
    connection: {
      db: {
        address: Env.get('DB_AGENDA_CONNECTION_ACTIVITY'),
        options: {
          useUnifiedTopology: true,
        },
        collection: Env.get('DB_AGENDA_COLLECTION_ACTIVITY'),
      },
    },
    jobsToProcess: Env.get('DB_AGENDA_JOBS_ACTIVITY', ''),
    singleTasks: [
      { frequency: Env.get('DAILY_SUMMARY_CRON', ''), name: JobNames.Emails.SummaryEmail, data: null },
      { frequency: Env.get('DAILY_SUMMARY_FEE_CRON', ''), name: JobNames.Emails.SummaryFeeAgreementEmail, data: null },
    ],
  },
  defaultTimezone: Env.get('DAILY_SUMMARY_TIMEZONE', 'America/Chicago'),
};
