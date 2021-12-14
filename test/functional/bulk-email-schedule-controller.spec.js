'use strict';

const { test, trait, before, after } = use('Test/Suite')('Bulk email Schedule');

//Repositories
const BulkEmailOptOutRepository = new (use('App/Helpers/BulkEmailOptOutRepository'))();

//Models
const SearchProject = use('App/Models/SearchProject');
const SearchProjectCandidate = use('App/Models/SearchProjectCandidate');
const SearchProjectHiringAuthority = use('App/Models/SearchProjectHiringAuthority');
const SearchProjectName = use('App/Models/SearchProjectName');
const Candidate = use('App/Models/Candidate');
const ScheduledEmail = use('App/Models/ScheduledEmail');
const EmailHistory = use('App/Models/EmailHistory');
const EmailTemplate = use('App/Models/EmailTemplate');
const EmailTemplateFolder = use('App/Models/EmailTemplateFolder');
const EmailBody = use('App/Models/EmailBody');
const SearchProjectChangeLog = use('App/Models/SearchProjectChangeLog');

//Utils
const url = 'api/v1';
const baseUrl = `${url}/bulk-emails/schedules`;
const { SearchProjectTypes, BulkEmailScopeTypes, CandidateStatusSchemes, nameTypes, nameStatus } =
  use('App/Helpers/Globals');
const moment = use('moment');
const Database = use('Database');

trait('Test/ApiClient');
trait('Auth/Client');
trait('Test/Traits/User');

let rootFolderId;

let testCandidates;

let searchProjectCandidate;
let schedule;
let scheduleBody;
let scheduleHistory;
let templateFolder;
let folderName;
let template;
let templateBody;

const dateNow = moment().format();
const subject = 'Bulk Email testing';
const text = 'This email was part of a test, please ignore it!';
const html = '<strong>This</strong> email was part of a test, please ignore it!';

before(async () => {
  folderName = `Folder unit testing ${moment.now()}`;

  const optOutQuery = Database.table('email_opt_outs').select('item_id');
  const unsubscribesQuery = Database.table('email_user_unsubscribes').select('email');
  testCandidates = await Database.table('contacts_directory')
    .select(['*', 'origin_table_id as id'])
    .where('role_id', nameTypes.Candidate)
    .whereNotNull('full_name')
    .whereNotNull('company_id')
    .whereNotIn('status_id', [nameStatus.Candidate.Placed, nameStatus.Candidate.Inactive])
    .whereNotIn('origin_table_id', optOutQuery)
    .whereNotIn('email', unsubscribesQuery)
    .limit(15);
  if (testCandidates.length <= 0) throw 'The test candidates could not be retrivied';
});

test('Should return 200 when all bulk email templates are requested, creating the user test folders', async ({
  client,
  user,
  assert,
}) => {
  const response = await client.get(`${url}/bulk-emails/templates`).loginVia(user, 'jwt').end();
  response.assertStatus(200);
  // assert.containsAllKeys(response.body, ['gpac', 'shared', 'mine']);
  assert.containsAllKeys(response.body, ['gpac', 'mine']);
  rootFolderId = (
    await EmailTemplateFolder.query().where('created_by', user.id).where('is_default_folder', true).first()
  ).toJSON().id;
});

test('Should return 401 when not sending a token', async ({ assert, client }) => {
  assert.plan(1);
  const response = await client.post(`${baseUrl}`).end();
  response.assertStatus(401);
});

test('Should return 201 when creating a SearchProject to use in the bulk email schedule', async ({
  client,
  assert,
  user,
}) => {
  const candidates = testCandidates.map((row) => row.id);
  const response = await client
    .post(`${url}/search-projects`)
    .loginVia(user, 'jwt')
    .send({
      name: 'Search project candidates test',
      is_private: false,
      candidates,
    })
    .end();
  response.assertStatus(201);
  assert.containsAllKeys(response.body, [
    'created_at',
    'id',
    'name',
    'searchProjectCandidates',
    'searchProjectHiringAuthories',
    'searchProjectNames',
    'updated_at',
  ]);

  searchProjectCandidate = await SearchProject.findOrFail(response.body.id);
});

test('Should return 201 when creating a bulk email template folder to use in the template for the schedule', async ({
  client,
  user,
}) => {
  const response = await client
    .post(`${url}/bulk-emails/folders`)
    .loginVia(user, 'jwt')
    .send({
      name: folderName,
      parent_folder_id: rootFolderId,
    })
    .end();
  response.assertStatus(201);
  response.assertJSONSubset({
    created_by: user.id,
    name: folderName,
    parent_folder_id: rootFolderId,
  });

  templateFolder = await EmailTemplateFolder.findOrFail(response.body.id);
});

test('Should return 201 when creating a bulk email template to use in the schedule', async ({ client, user }) => {
  const response = await client
    .post(`${url}/bulk-emails/templates`)
    .loginVia(user, 'jwt')
    .send({
      bulk_email_scope_type_id: BulkEmailScopeTypes.Global,
      name: 'Template test validator',
      parent_folder_id: templateFolder.id,
      subject,
      text,
      html,
    })
    .end();
  response.assertStatus(201);
  response.assertJSONSubset({
    name: 'Template test validator',
    created_by: user.id,
    email_template_folder_id: templateFolder.id,
    emailBody: {
      subject,
      text,
      html,
      attachments: [],
    },
  });

  template = await EmailTemplate.findOrFail(response.body.id);
  templateBody = await EmailBody.findOrFail(response.body.emailBody.id);
});

test('Should return 201 when creating a bulk email schedule', async ({ client, user }) => {
  const response = await client
    .post(`${baseUrl}`)
    .loginVia(user, 'jwt')
    .send({
      bulk_email_scope_type_id: BulkEmailScopeTypes.Global,
      search_project_id: searchProjectCandidate.id,
      block_resend: false,
      subject,
      text,
      html,
      send_date: dateNow,
      email_template_id: template.id,
    })
    .end();
  response.assertStatus(201);
  response.assertJSONSubset({
    created_by: user.id,
    is_sent: false,
    search_project_id: searchProjectCandidate.id,
    block_resend: false,
    email_template_id: template.id,
    emailBody: {
      subject,
      text,
      html,
    },
    scheduledEmail: {
      created_by: user.id,
    },
  });

  schedule = await ScheduledEmail.findOrFail(response.body.scheduledEmail.id);
  scheduleBody = await EmailBody.findOrFail(response.body.emailBody.id);
  scheduleHistory = await EmailHistory.findOrFail(response.body.id);
});

test('Should return 200 when all bulk email schedules are requested', async ({ client, user, assert }) => {
  const response = await client.get(`${baseUrl}/`).loginVia(user, 'jwt').end();
  response.assertStatus(200);
  assert.containsAllKeys(response.body.data[0], [
    'id',
    'created_by',
    'is_sent',
    'search_project_id',
    'email_template_id',
    'email_body_id',
    'block_resend',
    'emails_sent',
    'emails_blocked',
    'created_at',
    'updated_at',
    'block_duration_days',
    'scheduledEmail',
    'emailBody',
    'sendgrid_id',
    'send_date',
    'emails_invalid',
    'bulk_email_scope_type_id',
    'block_similar_companies',
  ]);
});

test('Should return 200 when one bulk email schedule is requested', async ({ client, user, assert }) => {
  const response = await client.get(`${baseUrl}/${scheduleHistory.id}`).loginVia(user, 'jwt').end();
  response.assertStatus(200);
  assert.containsAllKeys(response.body, [
    'id',
    'created_by',
    'is_sent',
    'search_project_id',
    'email_template_id',
    'email_body_id',
    'block_resend',
    'emails_sent',
    'emails_blocked',
    'created_at',
    'updated_at',
    'block_duration_days',
    'scheduledEmail',
    'emailBody',
    'sendgrid_id',
    'send_date',
    'emails_invalid',
    'bulk_email_scope_type_id',
    'block_similar_companies',
  ]);
  assert.containsAllKeys(response.body.emailBody, [
    'id',
    'subject',
    'text',
    'html',
    'created_at',
    'updated_at',
    'attachments',
  ]);
  assert.containsAllKeys(response.body.scheduledEmail, [
    'id',
    'created_by',
    'send_date',
    'email_history_id',
    'created_at',
    'updated_at',
  ]);
});

test('Should return 200 when updating a bulk email schedule subject', async ({ client, user }) => {
  const updatedSubject = `${subject} 2`;
  const response = await client
    .put(`${baseUrl}/${scheduleHistory.id}`)
    .loginVia(user, 'jwt')
    .send({
      search_project_id: searchProjectCandidate.id,
      block_resend: true,
      subject: updatedSubject,
      text,
      html,
      block_duration_days: 1,
    })
    .end();
  response.assertStatus(200);
  response.assertJSONSubset({
    created_by: user.id,
    is_sent: false,
    search_project_id: searchProjectCandidate.id,
    block_resend: true,
    block_duration_days: 1,
    emailBody: {
      subject: updatedSubject,
      text,
      html,
    },
    scheduledEmail: {
      created_by: user.id,
    },
  });
});

test('Should return 200 when updating a bulk email schedule subject back', async ({ client, user }) => {
  const response = await client
    .put(`${baseUrl}/${scheduleHistory.id}`)
    .loginVia(user, 'jwt')
    .send({
      search_project_id: searchProjectCandidate.id,
      block_resend: true,
      subject,
      text,
      html,
      block_duration_days: 1,
    })
    .end();
  response.assertStatus(200);
  response.assertJSONSubset({
    created_by: user.id,
    is_sent: false,
    search_project_id: searchProjectCandidate.id,
    block_resend: true,
    block_duration_days: 1,
    emailBody: {
      subject,
      text,
      html,
    },
    scheduledEmail: {
      created_by: user.id,
    },
  });
});

test('Should return 200 when updating a bulk email schedule date', async ({ client, user }) => {
  const newDate = moment(dateNow).add(1, 'day').format();
  const response = await client
    .put(`${baseUrl}/${scheduleHistory.id}/send-date`)
    .loginVia(user, 'jwt')
    .send({
      send_date: newDate,
    })
    .end();
  response.assertStatus(200);
  response.assertJSONSubset({
    created_by: user.id,
    is_sent: false,
    search_project_id: searchProjectCandidate.id,
    block_resend: true,
    emailBody: {
      subject,
      text,
      html,
    },
    scheduledEmail: {
      created_by: user.id,
      send_date: newDate,
    },
  });
});

test('Should return 409 when creating a bulk email schedule', async ({ client, user }) => {
  const response = await client
    .post(`${baseUrl}`)
    .loginVia(user, 'jwt')
    .send({
      bulk_email_scope_type_id: BulkEmailScopeTypes.Global,
      search_project_id: searchProjectCandidate.id,
      email_template_id: template.id,
      block_resend: true,
      block_duration_days: 15,
      subject,
      text,
      html,
      send_date: moment(dateNow).add(5, 'day'),
    })
    .end();
  response.assertStatus(409);
  response.assertJSONSubset({
    success: false,
    code: 409,
    data: {
      created_by: user.id,
      is_sent: false,
      search_project_id: searchProjectCandidate.id,
      block_resend: true,
      scheduledEmail: {
        created_by: user.id,
      },
    },
  });
});

test('Should return 200 when deleting a bulk email schedule', async ({ client, user }) => {
  const response = await client.delete(`${baseUrl}/${scheduleHistory.id}`).loginVia(user, 'jwt').end();
  response.assertStatus(200);
  response.assertJSONSubset({
    created_by: user.id,
    is_sent: false,
    search_project_id: searchProjectCandidate.id,
    block_resend: true,
    emailBody: {
      subject,
      text,
      html,
    },
    scheduledEmail: {
      created_by: user.id,
    },
  });
});

after(async () => {
  if (searchProjectCandidate) {
    await SearchProjectCandidate.query().where('search_project_id', searchProjectCandidate.id).delete();
    await SearchProjectHiringAuthority.query().where('search_project_id', searchProjectCandidate.id).delete();
    await SearchProjectName.query().where('search_project_id', searchProjectCandidate.id).delete();
    await SearchProjectChangeLog.query().where('search_project_id', searchProjectCandidate.id).delete();
    await searchProjectCandidate.delete();
  }

  if (template) {
    await template.delete();
  }

  if (templateBody) {
    await templateBody.delete();
  }

  if (templateFolder) {
    await templateFolder.delete();
  }

  if (schedule) {
    await schedule.delete();
  }

  if (scheduleHistory) {
    await scheduleHistory.delete();
  }

  if (scheduleBody) {
    await scheduleBody.delete();
  }

  if (scheduleBody) {
    await scheduleBody.delete();
  }

  if (templateBody) {
    await templateBody.delete();
  }
});
