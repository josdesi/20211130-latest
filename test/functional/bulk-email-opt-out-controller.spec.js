'use strict';

const { test, trait, before, after } = use('Test/Suite')('Bulk email opt out');

//Repositories
const BulkEmailOptOutRepository = new (use('App/Helpers/BulkEmailOptOutRepository'))();

//Models
const Candidate = use('App/Models/Candidate');
const HiringAuthority = use('App/Models/HiringAuthority');
const Name = use('App/Models/Name');
const EmailOptOut = use('App/Models/EmailOptOut');
const EmailOptOutType = use('App/Models/EmailOptOutType');
const SearchProject = use('App/Models/SearchProject');
const SearchProjectCandidate = use('App/Models/SearchProjectCandidate');
const SearchProjectHiringAuthority = use('App/Models/SearchProjectHiringAuthority');
const SearchProjectName = use('App/Models/SearchProjectName');
const EmailHistory = use('App/Models/EmailHistory');
const EmailBody = use('App/Models/EmailBody');
const EmailUserUnsubscribe = use('App/Models/EmailUserUnsubscribe');
const NameBulkActivityReference = use('App/Models/NameBulkActivityReference');
const JobOrderBulkActivityReference = use('App/Models/JobOrderBulkActivityReference');
const CandidateBulkActivityReference = use('App/Models/CandidateBulkActivityReference');
const HiringAuthorityBulkActivityReference = use('App/Models/HiringAuthorityBulkActivityReference');
const SearchProjectChangeLog = use('App/Models/SearchProjectChangeLog');
const Position = use('App/Models/Position');
const Company = use('App/Models/Company');

//Utils
const Helpers = use('Helpers');
const url = 'api/v1';
const baseUrl = `${url}/bulk-emails/opt-outs`;
const {
  EmailOptOutTypes,
  UnsubscribeReasonTypes,
  UnsubscribeReasons,
  BulkEmailScopeTypes,
  CandidateStatusSchemes,
  nameStatus,
  nameTypes,
} = use('App/Helpers/Globals');
const { ioc } = use('@adonisjs/fold');
const Services = new (use('App/Helpers/Services'))();
const Database = use('Database');

const dummyHA = {
  first_name: 'Test first',
  last_name: 'Test last',
  title: 'Test title',
  personal_email: '',
  personal_phone: '',
  work_email: `${new Date().getTime()}@test.com`,
  work_phone: '1234567890',
};

const dummyCompany = {
  name: 'Test Company',
  specialty_id: '1',
  subspecialty_id: '',
  city_id: '51086',
  zip: '37545',
  phone: '1234567890',
  ext: '123',
  email: `ThisCoNotExist${Date.now()}@test.com`,
  company_address: 'Company address',
  website: 'https://domain-test.com',
  link_profile: `https://profile-${Date.now()}.com`,
  hiringAuthorities: [dummyHA],
};

const dummyName = {
  first_name: 'The',
  last_name: 'Name',
  title: 'Is',
  email: `ThisNameNotExist${Date.now()}@test.com`,
  phone: '3105309856',
  ext: '9856',
  mobile: '3105309856',
  specialty_id: '1',
  source_type_id: 0,
  link_profile: `https://profile-${Date.now()}.com`,
  city_id: '51086',
};

trait('Test/ApiClient');
trait('Auth/Client');
trait('Test/Traits/User');

let testCandidates;
let unblockedCandidate;
let companyToDelete;
let contactToDelete;
let position;
let testHiringAuthority;
let testName;
let searchProject;
let bulkEmail;
let bulkBody;
let candidateOptOut;
let haOptOut;
let nameOptOut;
let manualOptOut;

let unsubscribeUserReason;
let randomNonExistantEmail;
let userUnsubscribe;

const subject = 'Bulk Email testing';
const text = 'This email was part of a test, please ignore it!';
const html = '<strong>This</strong> email was part of a test, please ignore it!';

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

  position = await Position.firstOrFail();

  unsubscribeUserReason = await UnsubscribeReasons.find(
    (reason) => reason.unsubscribe_reason_type_id === UnsubscribeReasonTypes.User.id
  );
  randomNonExistantEmail = `ThisUnsubDoesNotExist${Date.now()}@test.com`;
});

test('Should return 401 when not sending a token', async ({ assert, client }) => {
  assert.plan(1);
  const response = await client.post(`${baseUrl}`).end();
  response.assertStatus(401);
});

test('Should return 201 when creating a SearchProject (candidate)', async ({ client, assert, user }) => {
  const candidates = testCandidates.map((row) => row.id);
  const response = await client
    .post(`${url}/search-projects`)
    .loginVia(user, 'jwt')
    .send({
      name: 'Search project opt out test',
      is_private: true,
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

  searchProject = await SearchProject.findOrFail(response.body.id);
});

test('Should return 201 when creating a bulk email opt out (candidate)', async ({ client, user, assert }) => {
  const response = await client
    .post(`${baseUrl}`)
    .loginVia(user, 'jwt')
    .send({
      email_opt_out_type_id: EmailOptOutTypes.Candidate,
      item_id: testCandidates[0].id,
      unsubscribe_reason_id: UnsubscribeReasons[0].id,
      custom_reason: '',
      notes: 'This is a note',
    })
    .end();
  response.assertStatus(201);
  assert.containsAllKeys(response.body, [
    'id',
    'chosen_reason',
    'custom_reason',
    'reason_for_the_user',
    'created_at',
    'created_by',
    'item_id',
    'email_opt_out_type_id',
    'email',
    'item_full_name',
    'created_by_name',
    'is_unsubscribe',
    'title',
    'notes',
  ]);

  candidateOptOut = await EmailOptOut.findOrFail(response.body.id);
});

test('Should return 201 when creating a bulk email but with one candidate blocked', async ({ client, user }) => {
  ioc.fake('Services/Sendgrid', () => {
    return {
      sendBulkEmailToUsers() {
        return FakeSendgridResponse;
      },
    };
  });
  const response = await client
    .post(`${url}/bulk-emails`)
    .loginVia(user, 'jwt')
    .send({
      bulk_email_scope_type_id: BulkEmailScopeTypes.Global,
      is_draft: false,
      search_project_id: searchProject.id,
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
    search_project_id: searchProject.id,
    block_resend: false,
    emails_blocked: [{ id: testCandidates[0].id }],
    emailBody: {
      subject,
      text,
      html,
    },
  });

  bulkEmail = await EmailHistory.findOrFail(response.body.id);
  bulkBody = await EmailBody.findOrFail(response.body.emailBody.id);

  ioc.restore('Services/Sendgrid');
});

test('Should return 409 when creating a bulk email opt out that is duplicate', async ({ client, user }) => {
  const response = await client
    .post(`${baseUrl}`)
    .loginVia(user, 'jwt')
    .send({
      email_opt_out_type_id: EmailOptOutTypes.Candidate,
      item_id: testCandidates[0].id,
      unsubscribe_reason_id: UnsubscribeReasons[0].id,
      custom_reason: '',
    })
    .end();
  response.assertStatus(409);
  response.assertJSONSubset({
    success: false,
    code: 409,
    message: 'That opt out already exists',
  });
});

test('Should return 201 when creating a Company with a Hiring Authority for the opt out test', async ({
  client,
  user,
}) => {
  const response = await client.post(`${url}/companies`).loginVia(user, 'jwt').send(dummyCompany).end();
  response.assertStatus(201);

  companyToDelete = await Company.find(response.body.data.id);
  testHiringAuthority = await HiringAuthority.findBy('company_id', companyToDelete.id);
});

test('Should return 201 when creating a bulk email opt out (hiring authority)', async ({ client, user, assert }) => {
  const response = await client
    .post(`${baseUrl}`)
    .loginVia(user, 'jwt')
    .send({
      email_opt_out_type_id: EmailOptOutTypes.HiringAuthority,
      item_id: testHiringAuthority.id,
      unsubscribe_reason_id: UnsubscribeReasons[0].id,
      custom_reason: '',
      notes: '',
    })
    .end();
  response.assertStatus(201);
  assert.containsAllKeys(response.body, [
    'id',
    'chosen_reason',
    'custom_reason',
    'reason_for_the_user',
    'created_at',
    'created_by',
    'item_id',
    'email_opt_out_type_id',
    'email',
    'item_full_name',
    'created_by_name',
    'is_unsubscribe',
    'title',
    'notes',
  ]);

  haOptOut = await EmailOptOut.findOrFail(response.body.id);
});

test('Should return 201 when creating a Name', async ({ client, user }) => {
  const response = await client
    .post(`${url}/names`)
    .loginVia(user, 'jwt')
    .send({ ...dummyName, position_id: position.id, company_id: companyToDelete.id })
    .end();
  response.assertStatus(201);

  testName = await Name.find(response.body.data.id);
});

test('Should return 201 when creating a bulk email opt out (name)', async ({ client, user, assert }) => {
  const response = await client
    .post(`${baseUrl}`)
    .loginVia(user, 'jwt')
    .send({
      email_opt_out_type_id: EmailOptOutTypes.Names,
      item_id: testName.id,
      unsubscribe_reason_id: UnsubscribeReasons[0].id,
      custom_reason: 'Hi!',
      notes: 'This is a note... but for name!',
    })
    .end();
  response.assertStatus(201);
  assert.containsAllKeys(response.body, [
    'id',
    'chosen_reason',
    'custom_reason',
    'reason_for_the_user',
    'created_at',
    'created_by',
    'item_id',
    'email_opt_out_type_id',
    'email',
    'item_full_name',
    'created_by_name',
    'is_unsubscribe',
    'title',
    'notes',
  ]);

  nameOptOut = await EmailOptOut.findOrFail(response.body.id);
});

test('Should return 201 when creating a manual opt out (Unsubscribe)', async ({ client, user, assert }) => {
  const response = await client
    .post(`${baseUrl}`)
    .loginVia(user, 'jwt')
    .send({
      manual_email: `${Date.now()}@testing.com`,
      unsubscribe_reason_id: UnsubscribeReasons[0].id,
      custom_reason: 'Hi!',
      notes: 'This is a unsubscribe',
    })
    .end();
  response.assertStatus(201);
  assert.containsAllKeys(response.body, [
    'id',
    'chosen_reason',
    'custom_reason',
    'reason_for_the_user',
    'created_at',
    'created_by',
    'item_id',
    'email_opt_out_type_id',
    'email',
    'item_full_name',
    'created_by_name',
    'is_unsubscribe',
    'title',
    'notes',
  ]);

  manualOptOut = await EmailUserUnsubscribe.findOrFail(response.body.id);
});

test('Should return 200 when all opt outs (index) are requested', async ({ client, user, assert }) => {
  const filter = `?keyword=&page=1&perPage=20&orderBy=created_at&direction=desc&createdBy=`;
  const response = await client.get(`${baseUrl}/${filter}`).loginVia(user, 'jwt').end();
  response.assertStatus(200);
  assert.containsAllKeys(response.body, ['total', 'perPage', 'page', 'lastPage', 'data']);
});

test('Should return 200 when all opt outs (index) are requested & passing the createdBy field', async ({
  client,
  user,
  assert,
}) => {
  const filter = `?keyword=&page=1&perPage=20&orderBy=created_at&direction=desc&createdBy=${user.id}`;
  const response = await client.get(`${baseUrl}/${filter}`).loginVia(user, 'jwt').end();
  response.assertStatus(200);
  assert.containsAllKeys(response.body, ['total', 'perPage', 'page', 'lastPage', 'data']);
});

test('Should return 200 when all opt outs (index) are requested & passing the isUnsubscribe field', async ({
  client,
  user,
  assert,
}) => {
  const filter = `?keyword=&page=1&perPage=20&orderBy=created_at&direction=desc&isUnsubscribe=${true}`;
  const response = await client.get(`${baseUrl}/${filter}`).loginVia(user, 'jwt').end();
  response.assertStatus(200);
  assert.containsAllKeys(response.body, ['total', 'perPage', 'page', 'lastPage', 'data']);
});

test('Should return 200 when opt outs types are requested', async ({ client, user, assert }) => {
  const response = await client.get(`${baseUrl}/types`).loginVia(user, 'jwt').end();
  response.assertStatus(200);
  assert.containsAllKeys(response.body[0], ['id', 'title', 'created_at', 'updated_at']);
});

test('Should return 200 when opt outs reasons are requested', async ({ client, user, assert }) => {
  const response = await client.get(`${baseUrl}/reasons`).loginVia(user, 'jwt').end();
  response.assertStatus(200);
  assert.containsAllKeys(response.body[0], [
    'id',
    'description',
    'title',
    'unsubscribe_reason_type_id',
    'created_at',
    'updated_at',
    'needs_custom_reason',
  ]);
});

test('Should return 200 when opt outs recruiters are requested', async ({ client, user, assert }) => {
  const response = await client.get(`${baseUrl}/recruiters`).loginVia(user, 'jwt').end();
  response.assertStatus(200);
  assert.containsAllKeys(response.body[0], ['id', 'email', 'full_name']);
});

test('Should return 200 when a opt out is deleted', async ({ client, user, assert }) => {
  const response = await client
    .delete(`${baseUrl}/${candidateOptOut.id}?is_unsubscribe=false`)
    .loginVia(user, 'jwt')
    .end();
  response.assertStatus(200);
});

test('Should return 201 when creating a bulk email unsubscribe', async ({ client, user }) => {
  const response = await client
    .post(`${url}/bulk-unsubscribe`)
    .send({
      email: randomNonExistantEmail,
      unsubscribe_reason_id: unsubscribeUserReason.id,
    })
    .end();
  response.assertStatus(201);
  response.assertJSONSubset({
    email: randomNonExistantEmail,
    email_history_id: null,
    unsubscribe_reason_id: unsubscribeUserReason.id,
  });

  userUnsubscribe = await EmailUserUnsubscribe.findOrFail(response.body.id);
});

test('Should return 200 when possibles opt outs are requested', async ({ client, user, assert }) => {
  const filter = `?keyword=kevin&limit=25`;
  const response = await client.get(`${baseUrl}/search${filter}`).loginVia(user, 'jwt').end();
  response.assertStatus(200);
  assert.containsAllKeys(response.body[0], ['id', 'email', 'email_opt_out_type_id', 'full_name', 'found']);
});

after(async () => {
  if (userUnsubscribe) await userUnsubscribe.delete();

  if (manualOptOut) await manualOptOut.delete();

  if (candidateOptOut) await candidateOptOut.delete();

  if (haOptOut) await haOptOut.delete();

  if (nameOptOut) await nameOptOut.delete();

  if (bulkEmail) {
    await NameBulkActivityReference.query().where('email_history_id', bulkEmail.id).delete();
    await JobOrderBulkActivityReference.query().where('email_history_id', bulkEmail.id).delete();
    await CandidateBulkActivityReference.query().where('email_history_id', bulkEmail.id).delete();
    await HiringAuthorityBulkActivityReference.query().where('email_history_id', bulkEmail.id).delete();
    await bulkEmail.delete();
  }

  if (bulkBody) await bulkBody.delete();

  if (searchProject) {
    await SearchProjectCandidate.query().where('search_project_id', searchProject.id).delete();
    await SearchProjectHiringAuthority.query().where('search_project_id', searchProject.id).delete();
    await SearchProjectName.query().where('search_project_id', searchProject.id).delete();
    await SearchProjectChangeLog.query().where('search_project_id', searchProject.id).delete();
    await searchProject.delete();
  }

  if (testName) {
    await Database.table('company_has_name_employees').where('name_id', testName.id).delete();
    await testName.delete();
  }

  if (testHiringAuthority) await testHiringAuthority.delete();

  if (contactToDelete) await contact.delete();

});
