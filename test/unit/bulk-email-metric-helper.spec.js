'use strict';

// Utils
const { test } = use('Test/Suite')('Bulk Email Metric Helper');
const BulkEmailMetricBuilder = new (use('App/Helpers/BulkEmailMetricBuilder'))();
const {
  emailSent,
  emailsBlocked,
  emailsInvalid,
  sendgridSuccess,
  sendgridFailures,
  sendExpectedRecipients,
  openExpectedRecipients,
  spamExpectedRecipients,
  bouncedExpectedRecipients,
} = require('../utils/BulkEmailMetric');

// Constants
const BULK_METRIC_DATA_TEST = {
  id: 1227,
  created_by: 425,
  is_sent: true,
  search_project_id: 1255,
  email_template_id: null,
  email_body_id: 1822,
  block_resend: false,
  created_at: '2020-11-04 22:58:10',
  updated_at: '2020-11-04 22:59:43',
  block_duration_end: null,
  emails_sent: emailSent,
  emails_blocked: emailsBlocked,
  sendgrid_id: '$2a$10$FtBcrpV.v7K/aeqOHqc/8uZEmK5J7.a8zg9tEeOTj8fW79w.Yw8lW',
  send_date: null,
  emails_invalid: emailsInvalid,
  bulk_email_scope_type_id: null,
  block_similar_companies: false,
  block_client_companies: false,
  block_duration_days: null,
  search_project_selection_params: null,
  sendgridSuccessEvents: sendgridSuccess,
  sendgridFailuresEvents: sendgridFailures,
};
const SS_HEADERS = ['Email', 'Name', 'Date', 'Status', 'Reason'];
const SS_DATA_ALL_EXPECTED_RECIPIENTS = [
  SS_HEADERS,
  ...sendExpectedRecipients,
  ...openExpectedRecipients,
  ...spamExpectedRecipients,
  ...bouncedExpectedRecipients,
];
const SS_DATA_SEND_EXPECTED_RECIPIENTS = [SS_HEADERS, ...sendExpectedRecipients];
const SS_DATA_OPEN_EXPECTED_RECIPIENTS = [SS_HEADERS, ...openExpectedRecipients];
const SS_DATA_SPAM_EXPECTED_RECIPIENTS = [SS_HEADERS, ...spamExpectedRecipients];
const SS_DATA_BOUNCED_EXPECTED_RECIPIENTS = [SS_HEADERS, ...bouncedExpectedRecipients];
const SS_DATA_ERROR_ARRAY_ERROR = 'The SpreadSheet output should be always an array';
const SS_DATA_EXPECTED_RECIPIENTS_ERROR = `The output of the SS Data Array should have contained the expected recipients`;

test('check buildSpreadSheetMetricData is returning the expected outcome', async ({ assert }) => {
  const ssDataArray = BulkEmailMetricBuilder.buildSpreadSheetMetricData(BULK_METRIC_DATA_TEST);
  assert.isArray(ssDataArray, SS_DATA_ERROR_ARRAY_ERROR);
  assert.lengthOf(
    ssDataArray,
    SS_DATA_ALL_EXPECTED_RECIPIENTS.length,
    `The SpreadSheet Data Array should have a length of ${SS_DATA_ALL_EXPECTED_RECIPIENTS.length}`
  );
  assert.includeDeepMembers(ssDataArray, SS_DATA_ALL_EXPECTED_RECIPIENTS, SS_DATA_EXPECTED_RECIPIENTS_ERROR);
});

test('check buildSpreadSheetMetricData is returning the expected outcome with "send" type', async ({ assert }) => {
  const ssDataArray = BulkEmailMetricBuilder.buildSpreadSheetMetricData(BULK_METRIC_DATA_TEST, 'send');
  assert.isArray(ssDataArray, SS_DATA_ERROR_ARRAY_ERROR);
  assert.lengthOf(
    ssDataArray,
    SS_DATA_SEND_EXPECTED_RECIPIENTS.length,
    `The SpreadSheet Data Array with send type should have a length of ${SS_DATA_SEND_EXPECTED_RECIPIENTS.length}`
  );
  assert.includeDeepMembers(ssDataArray, SS_DATA_SEND_EXPECTED_RECIPIENTS, SS_DATA_EXPECTED_RECIPIENTS_ERROR);
});

test('check buildSpreadSheetMetricData is returning the expected outcome with "open" type', async ({ assert }) => {
  const ssDataArray = BulkEmailMetricBuilder.buildSpreadSheetMetricData(BULK_METRIC_DATA_TEST, 'open');
  assert.isArray(ssDataArray, SS_DATA_ERROR_ARRAY_ERROR);
  assert.lengthOf(
    ssDataArray,
    SS_DATA_OPEN_EXPECTED_RECIPIENTS.length,
    `The SpreadSheet Data Array with send type should have a length of ${SS_DATA_OPEN_EXPECTED_RECIPIENTS.length}`
  );
  assert.includeDeepMembers(ssDataArray, SS_DATA_OPEN_EXPECTED_RECIPIENTS, SS_DATA_EXPECTED_RECIPIENTS_ERROR);
});

test('check buildSpreadSheetMetricData is returning the expected outcome with "spam" type', async ({ assert }) => {
  const ssDataArray = BulkEmailMetricBuilder.buildSpreadSheetMetricData(BULK_METRIC_DATA_TEST, 'spam');
  assert.isArray(ssDataArray, SS_DATA_ERROR_ARRAY_ERROR);
  assert.lengthOf(
    ssDataArray,
    SS_DATA_SPAM_EXPECTED_RECIPIENTS.length,
    `The SpreadSheet Data Array with send type should have a length of ${SS_DATA_SPAM_EXPECTED_RECIPIENTS.length}`
  );
  assert.includeDeepMembers(ssDataArray, SS_DATA_SPAM_EXPECTED_RECIPIENTS, SS_DATA_EXPECTED_RECIPIENTS_ERROR);
});

test('check buildSpreadSheetMetricData is returning the expected outcome with "bounced" type', async ({ assert }) => {
  const ssDataArray = BulkEmailMetricBuilder.buildSpreadSheetMetricData(BULK_METRIC_DATA_TEST, 'bounced');
  assert.isArray(ssDataArray, SS_DATA_ERROR_ARRAY_ERROR);
  assert.lengthOf(
    ssDataArray,
    SS_DATA_BOUNCED_EXPECTED_RECIPIENTS.length,
    `The SpreadSheet Data Array with send type should have a length of ${SS_DATA_BOUNCED_EXPECTED_RECIPIENTS.length}`
  );
  assert.includeDeepMembers(ssDataArray, SS_DATA_BOUNCED_EXPECTED_RECIPIENTS, SS_DATA_EXPECTED_RECIPIENTS_ERROR);
});
