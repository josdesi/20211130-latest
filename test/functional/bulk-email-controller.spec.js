'use strict';

const { test, trait, before, after } = use('Test/Suite')('Bulk email');

//Repositories
const BulkEmailOptOutRepository = new (use('App/Helpers/BulkEmailOptOutRepository'))();

//Models
const Attachment = use('App/Models/Attachment');
const EmailHistory = use('App/Models/EmailHistory');
const EmailBody = use('App/Models/EmailBody');
const SearchProject = use('App/Models/SearchProject');
const SearchProjectCandidate = use('App/Models/SearchProjectCandidate');
const SearchProjectHiringAuthority = use('App/Models/SearchProjectHiringAuthority');
const SearchProjectName = use('App/Models/SearchProjectName');
const Candidate = use('App/Models/Candidate');
const EmailOptOut = use('App/Models/EmailOptOut');
const NameBulkActivityReference = use('App/Models/NameBulkActivityReference');
const JobOrderBulkActivityReference = use('App/Models/JobOrderBulkActivityReference');
const CandidateBulkActivityReference = use('App/Models/CandidateBulkActivityReference');
const HiringAuthorityBulkActivityReference = use('App/Models/HiringAuthorityBulkActivityReference');
const SearchProjectChangeLog = use('App/Models/SearchProjectChangeLog');

//Utils
const url = 'api/v1';
const baseUrl = `${url}/bulk-emails`;
const { SearchProjectTypes, BulkEmailScopeTypes, CandidateStatusSchemes, nameTypes, nameStatus } =
  use('App/Helpers/Globals');
const Helpers = use('Helpers');
const { ioc } = use('@adonisjs/fold');
const Database = use('Database');

trait('Test/ApiClient');
trait('Auth/Client');
trait('Test/Traits/User');

const FakeSendgridResponse = [
  {
    statusCode: 202,
    body: '',
    headers: {
      server: 'nginx',
      date: 'Fri, 25 Sep 2020 16:01:39 GMT',
      'content-length': '0',
      connection: 'close',
      'x-message-id': '1231231231231231231231',
      'access-control-allow-origin': 'https://sendgrid.api-docs.io',
      'access-control-allow-methods': 'POST',
      'access-control-allow-headers': 'Authorization, Content-Type, On-behalf-of, x-sg-elas-acl',
      'access-control-max-age': '600',
      'x-no-cors-reason': 'https://sendgrid.com/docs/Classroom/Basics/API/cors.html',
    },
  },
];

let templateFolder;
let template;
let templateBody;

let testCandidates;
let searchProjectCandidate;
let bulkEmail;
let bulkDraftEmail;
let bulkBody;
let bulkDraftBody;

let tmpFile;
let bulkEmailFromDraft;
let bulkEmailBodyFromDraft;
let bulkEmailAttachmentFromDraft;

const subject = 'Bulk Email testing';
const text = 'This email was part of a test, please ignore it!';
const html = '<strong>This</strong> email was part of a test, please ignore it!';

before(async () => {
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

  ioc.fake('Services/Sendgrid', () => {
    return {
      sendBulkEmailToUsers() {
        return FakeSendgridResponse;
      },
    };
  });

  if (testCandidates.length <= 0) throw 'The test candidates could not be retrivied';
});

test('Should return 401 when not sending a token', async ({ assert, client }) => {
  assert.plan(1);
  const response = await client.post(`${baseUrl}`).end();
  response.assertStatus(401);
});

test('Should return 201 when creating a SearchProject to use in the bulk email', async ({ client, assert, user }) => {
  const candidates = testCandidates.map((row) => row.id);
  const response = await client
    .post(`${url}/search-projects`)
    .loginVia(user, 'jwt')
    .send({
      name: `Search project candidates test ${Date.now()}`,
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

test('Should return 201 when creating a bulk email', async ({ client, user, assert }) => {
  // ioc.fake('Services/Sendgrid', () => {
  //   return {
  //     sendBulkEmailToUsers() {
  //       return FakeSendgridResponse;
  //     },
  //   };
  // });
  const response = await client
    .post(`${baseUrl}`)
    .loginVia(user, 'jwt')
    .send({
      is_draft: false,
      bulk_email_scope_type_id: BulkEmailScopeTypes.Global,
      search_project_id: searchProjectCandidate.id,
      block_resend: false,
      subject,
      text,
      html,
    })
    .end();
  response.assertStatus(201);
  response.assertJSONSubset({
    created_by: user.id,
    is_sent: true,
    search_project_id: searchProjectCandidate.id,
    block_resend: false,
    emailBody: {
      subject,
      text,
      html,
    },
  });

  assert.containsAllKeys(response.body, [
    'created_by',
    'is_sent',
    'search_project_id',
    'email_body_id',
    'block_resend',
    'created_at',
    'updated_at',
    'id',
    'emails_blocked',
    'emails_sent',
    'send_date',
    'emailBody',
  ]);

  bulkEmail = await EmailHistory.findOrFail(response.body.id);
  bulkBody = await EmailBody.findOrFail(response.body.emailBody.id);

  //ioc.restore('Services/Sendgrid');
});

test('Should return 201 when a File is uploaded to use in bulk email', async ({ client, user, assert }) => {
  const response = await client
    .post(`${baseUrl}/attachment`)
    .loginVia(user, 'jwt')
    .attach('file', Helpers.resourcesPath('Test_File.jpg'))
    .end();
  tmpFile = response.body;

  response.assertStatus(201);
  assert.containsAllKeys(tmpFile, ['id', 'url', 'file_name', 'original_name', 'created_at', 'user_id']);
});

test('Should return 200 when all bulk email sent histories are requested', async ({ client, user, assert }) => {
  const filter = `?limit=25`;
  const response = await client.get(`${baseUrl}${filter}`).loginVia(user, 'jwt').end();
  response.assertStatus(200);
  assert.containsAllKeys(response.body, ['total', 'perPage', 'page', 'lastPage', 'data']);
  assert.containsAllKeys(response.body.data[0], [
    'block_resend',
    'created_at',
    'created_by',
    'emailBody',
    'email_body_id',
    'email_template_id',
    'id',
    'is_sent',
    'searchProject',
    'search_project_id',
    'send_date',
  ]);
  assert.containsAllKeys(response.body.data[0].emailBody, ['id', 'subject', 'text', '__meta__']);
  assert.containsAllKeys(response.body.data[0].searchProject, ['id', 'name']);
});

test('Should return 200 when one bulk email history is requested', async ({ client, user, assert }) => {
  const response = await client.get(`${baseUrl}/${bulkEmail.id}`).loginVia(user, 'jwt').end();
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
    'emailBody',
    'sendgrid_id',
    'send_date',
    'emails_invalid',
    'searchProject',
    'bulkType',
    'bulk_email_scope_type_id',
    'marketingCandidates',
    'recruitingJobOrder',
    'block_similar_companies',
    'failureMessage',
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
});

test('Should return 201 when creating a bulk email draft with attachments', async ({ client, user }) => {
  //A draft should be able to work with out the 'required' fields
  // ioc.fake('Services/Sendgrid', () => {
  //   return {
  //     sendBulkEmailToUsers() {
  //       return FakeSendgridResponse;
  //     },
  //   };
  // });
  const response = await client
    .post(`${baseUrl}`)
    .loginVia(user, 'jwt')
    .send({
      is_draft: true,
      // bulk_email_scope_type_id: BulkEmailScopeTypes.Global,
      search_project_id: searchProjectCandidate.id,
      // block_resend: false,
      subject,
      // text,
      // html,
      files: [tmpFile.id],
    })
    .end();
  response.assertStatus(201);
  response.assertJSONSubset({
    created_by: user.id,
    is_sent: false,
    search_project_id: searchProjectCandidate.id,
    // block_resend: false,
    emailBody: {
      subject,
      // text,
      // html,
      attachments: [
        {
          name: tmpFile.original_name,
        },
      ],
    },
  });

  bulkDraftEmail = await EmailHistory.findOrFail(response.body.id);
  bulkDraftBody = await EmailBody.findOrFail(response.body.emailBody.id);

  //ioc.restore('Services/Sendgrid');
});

test('Should return 200 when all bulk email drafs histories are requested', async ({ client, user, assert }) => {
  const filter = `?limit=25`;
  const response = await client.get(`${baseUrl}/drafts${filter}`).loginVia(user, 'jwt').end();
  response.assertStatus(200);
  assert.containsAllKeys(response.body, ['total', 'perPage', 'page', 'lastPage', 'data']);
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
    'emailBody',
    'sendgrid_id',
    'send_date',
    'emails_invalid',
    'searchProject',
    'bulk_email_scope_type_id',
    'block_similar_companies',
  ]);
  assert.containsAllKeys(response.body.data[0].emailBody, ['id', 'subject', 'text', '__meta__']);
});

test('Should return 200 when updating a bulk email draft', async ({ client, user }) => {
  const updatedSubject = `${subject} 2`;
  const response = await client
    .put(`${baseUrl}/drafts/${bulkDraftEmail.id}`)
    .loginVia(user, 'jwt')
    .send({
      search_project_id: searchProjectCandidate.id,
      block_resend: false,
      subject: updatedSubject,
      text,
      html,
    })
    .end();
  response.assertStatus(200);
  response.assertJSONSubset({
    id: bulkDraftEmail.id,
    created_by: user.id,
    is_sent: false,
    search_project_id: searchProjectCandidate.id,
    block_resend: false,
    emailBody: {
      id: bulkDraftBody.id,
      subject: updatedSubject,
      text,
      html,
    },
  });
});

test('Should return 201 when a File is uploaded to use in bulk email draft again', async ({ client, user, assert }) => {
  const response = await client
    .post(`${baseUrl}/attachment`)
    .loginVia(user, 'jwt')
    .attach('file', Helpers.resourcesPath('Test_File.jpg'))
    .end();
  tmpFile = response.body;

  response.assertStatus(201);
  assert.containsAllKeys(tmpFile, ['id', 'url', 'file_name', 'original_name', 'created_at', 'user_id']);
});

test('Should return 201 when creating a bulk email from a draft with attachments', async ({ client, user, assert }) => {
  // ioc.fake('Services/Sendgrid', () => {
  //   return {
  //     sendBulkEmailToUsers() {
  //       return FakeSendgridResponse;
  //     },
  //   };
  // });
  const response = await client
    .post(`${baseUrl}`)
    .loginVia(user, 'jwt')
    .send({
      is_draft: false,
      bulk_email_scope_type_id: BulkEmailScopeTypes.Global,
      search_project_id: searchProjectCandidate.id,
      block_resend: false,
      subject,
      text,
      html,
      draft_id: bulkDraftEmail.id,
    })
    .end();
  response.assertStatus(201);
  response.assertJSONSubset({
    created_by: user.id,
    is_sent: true,
    search_project_id: searchProjectCandidate.id,
    block_resend: false,
    emailBody: {
      subject,
      text,
      html,
      attachments: [
        {
          name: tmpFile.original_name,
        },
      ],
    },
  });

  assert.containsAllKeys(response.body, [
    'created_by',
    'is_sent',
    'search_project_id',
    'email_body_id',
    'block_resend',
    'created_at',
    'updated_at',
    'id',
    'emails_blocked',
    'emails_sent',
    'send_date',
    'emailBody',
  ]);

  bulkEmailFromDraft = await EmailHistory.findOrFail(response.body.id);
  bulkEmailBodyFromDraft = await EmailBody.findOrFail(response.body.emailBody.id);
  bulkEmailAttachmentFromDraft = await Attachment.findOrFail(response.body.emailBody.attachments[0].id);

  //ioc.restore('Services/Sendgrid');
});

test('Should return 201 when creating a bulk email draft again to be deleted', async ({ client, user }) => {
  // ioc.fake('Services/Sendgrid', () => {
  //   return {
  //     sendBulkEmailToUsers() {
  //       return FakeSendgridResponse;
  //     },
  //   };
  // });
  const response = await client
    .post(`${baseUrl}`)
    .loginVia(user, 'jwt')
    .send({
      is_draft: true,
      bulk_email_scope_type_id: BulkEmailScopeTypes.Global,
      search_project_id: searchProjectCandidate.id,
      block_resend: false,
      subject,
      text,
      html,
      files: [tmpFile.id],
    })
    .end();
  response.assertStatus(201);
  response.assertJSONSubset({
    created_by: user.id,
    is_sent: false,
    search_project_id: searchProjectCandidate.id,
    block_resend: false,
    emailBody: {
      subject,
      text,
      html,
      attachments: [
        {
          name: tmpFile.original_name,
        },
      ],
    },
  });

  bulkDraftEmail = await EmailHistory.findOrFail(response.body.id);
  bulkDraftBody = await EmailBody.findOrFail(response.body.emailBody.id);

  //ioc.restore('Services/Sendgrid');
});

test('Should return 200 when deleting a bulk email draft', async ({ client, user }) => {
  const response = await client.delete(`${baseUrl}/drafts/${bulkDraftEmail.id}`).loginVia(user, 'jwt').end();
  response.assertStatus(200);
  response.assertJSONSubset({
    id: bulkDraftEmail.id,
    created_by: user.id,
    is_sent: false,
    search_project_id: searchProjectCandidate.id,
    block_resend: false,
    emailBody: {
      id: bulkDraftBody.id,
      subject,
      text,
      html,
      attachments: [
        {
          name: tmpFile.original_name,
        },
      ],
    },
  });
});

test('Should return 200 when all bulk email scopes are requested', async ({ client, assert, user }) => {
  const response = await client.get(`${baseUrl}/scopes`).loginVia(user, 'jwt').end();
  response.assertStatus(200);
  assert.containsAllKeys(response.body[0], ['created_at', 'updated_at', 'id', 'title']);
});

test('Should return 200 when requesting a bulk body preview', async ({ client, assert, user }) => {
  const response = await client
    .post(`${baseUrl}/preview/body`)
    .loginVia(user, 'jwt')
    .send({
      search_project_id: searchProjectCandidate.id,
      body: '<p>Please, if you received this email <i>{{full_name}}</i> ignore it, this is a test for a new implementation &amp; it should not have been sent to you.</p><p>{{your_signature}}</p>',
    })
    .end();
  response.assertStatus(200);
  assert.containsAllKeys(response.body, ['body', 'to_email', 'to_name']);
});

after(async () => {
  if (bulkEmail) {
    await NameBulkActivityReference.query().where('email_history_id', bulkEmail.id).delete();
    await JobOrderBulkActivityReference.query().where('email_history_id', bulkEmail.id).delete();
    await CandidateBulkActivityReference.query().where('email_history_id', bulkEmail.id).delete();
    await HiringAuthorityBulkActivityReference.query().where('email_history_id', bulkEmail.id).delete();
    await bulkEmail.delete();
  }

  if (bulkBody) {
    await bulkBody.delete();
  }

  if (bulkDraftEmail) {
    await bulkDraftEmail.delete();
  }

  if (bulkDraftBody) {
    await bulkDraftBody.delete();
  }

  if (bulkEmailFromDraft) {
    await NameBulkActivityReference.query().where('email_history_id', bulkEmailFromDraft.id).delete();
    await JobOrderBulkActivityReference.query().where('email_history_id', bulkEmailFromDraft.id).delete();
    await CandidateBulkActivityReference.query().where('email_history_id', bulkEmailFromDraft.id).delete();
    await HiringAuthorityBulkActivityReference.query().where('email_history_id', bulkEmailFromDraft.id).delete();
    await bulkEmailFromDraft.delete();
  }

  if (bulkEmailAttachmentFromDraft) {
    await bulkEmailAttachmentFromDraft.delete();
  }

  if (bulkEmailBodyFromDraft) {
    await bulkEmailBodyFromDraft.delete();
  }

  if (searchProjectCandidate) {
    await SearchProjectCandidate.query().where('search_project_id', searchProjectCandidate.id).delete();
    await SearchProjectHiringAuthority.query().where('search_project_id', searchProjectCandidate.id).delete();
    await SearchProjectName.query().where('search_project_id', searchProjectCandidate.id).delete();
    await SearchProjectChangeLog.query().where('search_project_id', searchProjectCandidate.id).delete();
    await searchProjectCandidate.delete();
  }
});
