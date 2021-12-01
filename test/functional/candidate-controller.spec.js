'use strict';

const { before, after, test, trait } = use('Test/Suite')('Candidates');
const Event = use('Event');
const Helpers = use('Helpers');

const Candidate = use('App/Models/Candidate');
const CandidateHasFile = use('App/Models/CandidateHasFile');
const BlueSheet = use('App/Models/BlueSheet');
const PersonalInformation = use('App/Models/PersonalInformation');
const Address = use('App/Models/Address');
const Contact = use('App/Models/Contact');
const ZipCode = use('App/Models/ZipCode');
const Events = require('../../app/Helpers/Events');
const { CandidateStatusSchemes, CandidateTypeSchemes, activityLogTypes } = use('App/Helpers/Globals');
const Company = use('App/Models/Company');
const CompanyHasCandidateEmployee = use('App/Models/CompanyHasCandidateEmployee');
const CandidateRecruiterAssignment = use('App/Models/CandidateRecruiterAssignment');

const apiPath = 'api/v1';
const baseUrl = `${apiPath}/candidates`;

let zipCode;
let candidate;
let personalInformation;
let contact;
let address;
let bluesheet;
let file;
let noteId;
let activityId;
let tmpFile;
let employeerCompany;
let candidateWithOldCompany;

trait('Test/ApiClient');
trait('Auth/Client');
trait('Test/Traits/User');

const candidateProfileKeys = [
  'id',
  'email',
  'title',
  'link_profile',
  'hot_item',
  'hot_item_date',
  'created_at',
  'updated_at',
  'created_by',
  'updated_by',
  'current_company',
  'migration_record',
  'migration_record_changed',
  'last_activity_date',
  'specialty',
  'subspecialty',
  'position',
  'recruiter',
  'personalInformation',
  'employerCompanies',
  'blueSheets',
  'sourceType',
  'createdBy',
  'files',
  'notes',
  'activityLogs',
  'jobOrders',
  'coach',
  'status',
  'shouldAskRecruiterAddEmployer',
];

const newCandidateKeys = [
  'personal_information_id',
  'industry_id',
  'position_id',
  'status_id',
  'recruiter_id',
  'email',
  'title',
  'link_profile',
  'source_type_id',
  'created_by',
  'updated_by',
  'specialty_id',
  'created_at',
  'updated_at',
  'id',
];

before(async () => {
  zipCode = await ZipCode.firstOrFail();
  employeerCompany = await Company.firstOrFail();
  candidateWithOldCompany = await Candidate.query().whereNotNull('current_company').first()
  Event.fake();
});

test('Should return 401 when not sending a token', async ({ assert, client }) => {
  assert.plan(1);
  const response = await client.get(`${baseUrl}`).end();
  response.assertStatus(401);
});

test('Should return 400 if no pagination params', async ({ client, user, assert }) => {
  const response = await client.get(`${baseUrl}`).loginVia(user, 'jwt').end();

  response.assertStatus(400);
});

test('Should return 200 and all properties when listing candidates', async ({ client, user, assert }) => {
  const response = await client.get(`${baseUrl}?page=1&perPage=10`).loginVia(user, 'jwt').end();
  response.assertStatus(200);
  assert.containsAllKeys(response.body.data[0], [
    'id',
    'full_name',
    'state',
    'city',
    'country',
    'specialty_title',
    'functional_title',
    'status',
    'minimum_salary',
    'good_salary',
    'no_brainer_salary',
    'created_at',
    'recruiter',
    'location',
    'salary_range',
    'type',
    'last_activity_date',
    'email',
    'current_company',
    'company_id',
  ]);
});

test('Should return 404 when a Candidate is Not Found', async ({ client, user, assert }) => {
  assert.plan(1);
  const response = await client.get(`${baseUrl}/-1`).loginVia(user, 'jwt').end();

  response.assertStatus(404);
});

test('Should return 200 when listing Candidate statuses', async ({ client, user, assert }) => {
  const response = await client
    .get(`${baseUrl}/statuses`)
    .loginVia(user, 'jwt')
    .send()
    .end();

  response.assertStatus(200);
  assert.isArray(response.body);
  assert.notEqual(response.body.length, 0);

  assert.containsAllKeys(
    response.body[0],
    [
      'id',
      'title',
      'style',
      'selectable'
    ]);
});

test('Should return 200 and only selectable Candidate statuses when selectable is true', async ({
  client,
  user,
  assert,
}) => {
  const response = await client
    .get(`${baseUrl}/statuses`)
    .loginVia(user, 'jwt')
    .send({ selectable: 'true' })
    .end();

  response.assertStatus(200);
  assert.isArray(response.body);
  assert.notEqual(response.body.length, 0);

  response.body.forEach(item => assert.propertyVal(item, 'selectable', true , 'All CA statuses should be selectable'));

});


test('Should return 400 when a Bad ID is Sent', async ({ client, user, assert }) => {
  assert.plan(1);
  const response = await client.get(`${baseUrl}/BadID`).loginVia(user, 'jwt').end();
  response.assertStatus(400);
});

test('Should return 200 when a Candidate Profile is Requested', async ({ client, user, assert }) => {
  const someCandidate = await Candidate.firstOrFail();

  const response = await client.get(`${baseUrl}/${someCandidate.id}`).loginVia(user, 'jwt').end();
  response.assertStatus(200);
  assert.hasAnyKeys(response.body, candidateProfileKeys);
});

/* Should be 201 */
test('Should return 200 when a File is uploaded for candidate creation', async ({ client, user, assert }) => {
  const response = await client
    .post(`${apiPath}/files`)
    .loginVia(user, 'jwt')
    .attach('file', Helpers.resourcesPath('Test_File.jpg'))
    .end();
  tmpFile = response.body;

  response.assertStatus(200);
  assert.containsAllKeys(tmpFile, ['id', 'url', 'file_name', 'original_name', 'created_at', 'user_id']);
});

test('Should return 201 when creating a Candidate', async ({ client, user, assert }) => {
  const response = await client
    .post(`${baseUrl}`)
    .loginVia(user, 'jwt')
    .send({
      company_id: employeerCompany.id,
      first_name: 'Connie',
      last_name: 'Payne',
      phone: '0921905240',
      zip: zipCode.zip_ch,
      state_id: zipCode.state_id,
      title: 'Designer',
      email: `${new Date().getTime()}-connie@gorillamail.com`,
      industry_id: 1,
      specialty_id: 1,
      position_id: 2,
      status_id: CandidateStatusSchemes.Ongoing,
      city_id: zipCode.city_id,
      source_type_id: 0,
      files: [tmpFile.id],
      link_profile: 'https://linkedin.com',
      blueSheet: {
        reason_leaving: 'Felt uncomfortable',
        achievement_one: 'Achievement',
        achievement_two: 'Achievement',
        achievement_three: 'Achievement',
        experience: 'Experience and skills',
        time_looking: '2020-04-21T17:44:45.463Z',
        time_to_start: 'When the coronavirus ends',
        minimum_salary: '2100.05',
        good_salary: '2000.02',
        no_brainer_salary: '3000.01',
        make_a_change: 0,
        interview_dates: ['2020-04-21T17:44:45.463Z'],
        time_start_type_id: 0,
        candidate_type_id: CandidateTypeSchemes.Alpha,
        notes: 'as',
        work_type_option_id: 1,
      },
    })
    .end();
  response.assertStatus(201);

  response.assertJSONSubset({
    success: true,
    message: 'Candidate created successfully',
    data: response.body.data,
  });
  assert.containsAllKeys(response.body.data, newCandidateKeys);

  candidate = await Candidate.find(response.body.data.id);
  personalInformation = await PersonalInformation.find(candidate.personal_information_id);
  contact = await Contact.find(personalInformation.contact_id);
  address = await Address.find(personalInformation.address_id);
  bluesheet = await BlueSheet.findBy('candidate_id', candidate.id);

  const recentEvent = Event.pullRecent();
  assert.equal(recentEvent.event, Events.Candidate.Created);
});

test('Should return 400 when a File with an invalid extension is uploaded', async ({ client, user, assert }) => {
  assert.plan(1);
  const response = await client
    .post(`${baseUrl}/${candidate.id}/files`)
    .loginVia(user, 'jwt')
    .attach('file', Helpers.resourcesPath('BadFile.js'))
    .end();
  response.assertStatus(400);
});

test('Should return 201 when a File is uploaded', async ({ client, user, assert }) => {
  const response = await client
    .post(`${baseUrl}/${candidate.id}/files`)
    .loginVia(user, 'jwt')
    .attach('file', Helpers.resourcesPath('Test_File.jpg'))
    .end();

  file = response.body;
  response.assertStatus(201);
  assert.containsAllKeys(file, ['candidate_id', 'url', 'file_name', 'id', 'ext', 'file_type_id']);
});

test('Should return 200 when a File is deleted', async ({ client, user }) => {
  const response = await client.delete(`${baseUrl}/${candidate.id}/files/${file.id}`).loginVia(user, 'jwt').end();
  response.assertStatus(200);
});

test('Should return 201 when creating a candidate note', async ({ client, user, assert }) => {
  const response = await client
    .post(`${baseUrl}/${candidate.id}/notes/`)
    .loginVia(user, 'jwt')
    .send({
      body: '<h3>This is a candidate-test note</h3>',
      title: 'Title Test',
    })
    .end();

  response.assertStatus(201);
  assert.containsAllKeys(response.body.data, [
    'id',
    'user_id',
    'user',
    'candidate_id',
    'body',
    'title',
    'created_at',
    'updated_at',
  ]);
  noteId = response.body.data.id;
});

test('Should return 201 when updating a candidate note', async ({ client, user, assert }) => {
  const response = await client
    .put(`${baseUrl}/${candidate.id}/notes/${noteId}`)
    .loginVia(user, 'jwt')
    .send({
      body: '<h3>This is a test note</h3>',
      title: 'Title Test',
    })
    .end();
  response.assertStatus(201);
  assert.containsAllKeys(response.body, [
    'id',
    'user_id',
    'user',
    'candidate_id',
    'body',
    'title',
    'created_at',
    'updated_at',
  ]);
});

test('Should return 200 when deleting a candidate note', async ({ client, user, assert }) => {
  const response = await client.delete(`${baseUrl}/${candidate.id}/notes/${noteId}`).loginVia(user, 'jwt').end();
  response.assertStatus(200);
});

test('Should return 201 when creating a candidate activity', async ({ client, user, assert }) => {
  const response = await client
    .post(`${baseUrl}/${candidate.id}/activityLogs`)
    .loginVia(user, 'jwt')
    .send({
      body: '<h3>This is a candidate test activity log</h3>',
      activity_log_type_id: activityLogTypes.SMS,
    })
    .end();
  response.assertStatus(201);
  assert.containsAllKeys(response.body.data, [
    'id',
    'user_id',
    'user',
    'candidate_id',
    'activity_log_type_id',
    'body',
    'activityLogType',
    'created_at',
    'updated_at',
  ]);
  activityId = response.body.data.id;
});

test('Should return 201 when updating a candidate activity', async ({ client, user, assert }) => {
  const response = await client
    .put(`${baseUrl}/${candidate.id}/activityLogs/${activityId}`)
    .loginVia(user, 'jwt')
    .send({
      body: '<h3>This is a candidate -test activity log</h3>',
      activity_log_type_id: activityLogTypes.Email,
    })
    .end();
  response.assertStatus(201);
  assert.containsAllKeys(response.body, [
    'id',
    'user_id',
    'user',
    'candidate_id',
    'activity_log_type_id',
    'body',
    'activityLogType',
    'created_at',
    'updated_at',
  ]);
});

test('Should return 201 when adding a employer company to a candidate', async ({ client, user, assert }) => {
  const response = await client
    .post(`${baseUrl}/${candidate.id}/employer-company`)
    .loginVia(user, 'jwt')
    .send({
      company_id: employeerCompany.id,
    })
    .end();
  response.assertStatus(201);
  console.log(response.body.employerCompanies[0]);
  assert.hasAnyKeys(response.body.employerCompanies[0], [
    'id',
    'industry_id',
    'contact_id',
    'address_id',
    'recruiter_id',
    'name',
    'email',
    'website',
    'link_profile',
    'fee_agreement_url',
    'created_at',
    'updated_at',
    'created_by',
    'updated_by',
    'file_name',
    'specialty_id',
    'subspecialty_id',
    'migration_record',
    'migration_record_changed',
    'searchable_text',
    'last_activity_date',
    'signed',
    'company_type_id',
  ]);
});

test('Should return 200 when listing the employees from a company', async ({ client, user, assert }) => {
  const filter = '?page=1&perPage=10';
  const response = await client.get(`${apiPath}/companies/${employeerCompany.id}/employees${filter}`).loginVia(user, 'jwt').end();
  response.assertStatus(200);
  assert.containsAllKeys(response.body.data[0], [
    'id',
    'email',
    'title',
    'full_name',
    'location',
    'state',
    'city',
    'specialty',
    'subspecialty',
    'is_name',
    'phone',
    'ext',
    'mobile',
  ]);
});

test('Should return 200 when deleting a candidate activity', async ({ client, user, assert }) => {
  const response = await client
    .delete(`${baseUrl}/${candidate.id}/activityLogs/${activityId}`)
    .loginVia(user, 'jwt')
    .end();
  response.assertStatus(200);
});

test('Should return 200 when the suggestion endpoint is requested', async ({ client, user }) => {
  const response = await client.get(`${baseUrl}/${candidateWithOldCompany.id}/suggested-companies`).loginVia(user, 'jwt').end();
  response.assertStatus(200);
});

after(async () => {
  bluesheet && (await bluesheet.delete());
  candidate && (await CompanyHasCandidateEmployee.query().where('candidate_id', candidate.id).delete());
  candidate && (await CandidateHasFile.query().where('candidate_id', candidate.id).delete());
  candidate && (await CandidateRecruiterAssignment.query().where('candidate_id', candidate.id).delete());
  candidate && (await candidate.delete());
  personalInformation && (await personalInformation.delete());
  address && (await address.delete());
  contact && (await contact.delete());
});
