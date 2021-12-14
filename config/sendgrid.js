'use strict';

/** @type {import('@adonisjs/framework/src/Env')} */
const Env = use('Env');

module.exports = {
  apiKey: Env.get('SENDGRID_API_KEY'),
  emailValidationApiKey: Env.get('SENDGRID_EMAIL_VALIDATION_API_KEY'),
  dailySummaryCron: Env.get('DAILY_SUMMARY_CRON'),
  dailySummaryTimezone: Env.get('DAILY_SUMMARY_TIMEZONE'),
};
