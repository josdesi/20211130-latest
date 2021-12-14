'use strict';

const { test, trait, before, after } = use('Test/Suite')('Names');
const Position = use('App/Models/Position');
const Specialty = use('App/Models/Specialty');
const Address = use('App/Models/Address');
const ZipCode = use('App/Models/ZipCode');
const Name = use('App/Models/Name');
const url = 'api/v1';
const Helpers = use('Helpers');
const { activityLogTypes } = use('App/Helpers/Globals');
const Company = use('App/Models/Company');
const CompanyHasNameEmployee = use('App/Models/CompanyHasNameEmployee');

trait('Test/ApiClient');
trait('Auth/Client');
trait('Test/Traits/User');

let position;
let zipCode;
let name;
let address;
let specialty;
let personalInformation;
let contact;
let date;
let file_id;
let note_id;
let activityLog_id;
let employeerCompany;
let nameWithOldCompany;

const createUtils = async () => {
  date = Date.now();
  specialty = await Specialty.firstOrFail();
  position = await Position.firstOrFail();
  zipCode = await ZipCode.firstOrFail();
};

before(async () => {
  employeerCompany = await Company.firstOrFail();
  nameWithOldCompany = await Name.query().whereNotNull('current_company').first()
});

test('Should return 401 when not sending a token', async ({ assert, client }) => {
  assert.plan(1);
  const response = await client.post(`${url}/names`).end();
  response.assertStatus(401);
});

test('Should return 201 when creating a Name', async ({ client, user }) => {
  await createUtils();
  const urlProfile = `https://asmtutor.com/${date}`;
  const response = await client
    .post(`${url}/names`)
    .loginVia(user, 'jwt')
    .send({
      company_id: employeerCompany.id,
      first_name: 'Scarlett',
      last_name: 'Romero',
      title: 'Test Name',
      email: `${date}@example.com`,
      phone: '3105309856',
      ext: '9856',
      mobile: '3105309856',
      specialty_id: specialty.id,
      position_id: position.id,
      source_type_id: 0,
      link_profile: urlProfile,
      current_company: 'Name company test',
      city_id: zipCode.city_id,
      zip: zipCode.zip_ch,
    })
    .end();
  response.assertStatus(201);
  response.assertJSONSubset({
    success: true,
    message: 'The name record was created successfully',
    data: {
      title: 'Test Name',
      email: `${date}@example.com`,
      position_id: position.id,
      source_type_id: 0,
      link_profile: urlProfile,
      current_company: 'Name company test',
      created_by: user.id,
      updated_by: user.id,
    },
  });

  name = await Name.find(response.body.data.id);
  personalInformation = await name.personalInformation().fetch();
  contact = await personalInformation.contact().fetch();
  address = await personalInformation.address().fetch();
});

test('Should return 200 and a pagination object of Names', async ({ client, user, assert }) => {
  const response = await client.get(`${url}/names`).loginVia(user, 'jwt').end();

  response.assertStatus(200);
  assert.hasAllKeys(response.body, ['total', 'perPage', 'page', 'data', 'lastPage']);
});

test('Should return 400 when a Bad ID is Sent', async ({ client, user, assert }) => {
  assert.plan(1);
  const response = await client.get(`${url}/names/BadID`).loginVia(user, 'jwt').end();
  response.assertStatus(400);
});

test('Should return 200 when a Name Profile is Requested', async ({ client, user, assert }) => {
  const response = await client.get(`${url}/names/${name.id}`).loginVia(user, 'jwt').end();
  response.assertStatus(200);
  assert.hasAnyKeys(response.body, [
    'id',
    'email',
    'link_profile',
    'title',
    'current_company',
    'personalInformation',
    'specialty',
    'subspecialty',
    'position',
    'sourceType',
    'nameType',
    'name_status_id',
    'files',
    'notes',
    'activityLogs',
    'nameStatus',
    'created_at',
    'updated_at',
    'created_by',
    'updated_by',
    'migration_record',
    'migration_record_changed',
    'convertion_date',
    'company_id',
    'employerCompanies',
    'shouldAskRecruiterAddEmployer',
  ]);
});

test('Should return 404 when sending a non existing Name on Update', async ({ client, user, assert }) => {
  assert.plan(1);
  const response = await client
    .put(`${url}/names/0`)
    .loginVia(user, 'jwt')
    .send({
      title: 'Updated Test Name',
      first_name: 'Scarlett',
      last_name: 'Romero',
      specialty_id: specialty.id,
      position_id: position.id,
      source: 'https://updated-domain-test.com',
    })
    .end();
  response.assertStatus(404);
});

test('Should return 201 when updating the Name', async ({ client, user, assert }) => {
  const response = await client
    .put(`${url}/names/${name.id}`)
    .loginVia(user, 'jwt')
    .send({
      title: 'Updated Test Name',
      first_name: 'Scarlett',
      last_name: 'Romero',
      specialty_id: specialty.id,
      position_id: position.id,
      source: 'https://updated-domain-test.com',
    })
    .end();
  response.assertStatus(201);
  assert.hasAnyKeys(response.body, [
    'id',
    'email',
    'link_profile',
    'title',
    'current_company',
    'personalInformation',
    'specialty',
    'subspecialty',
    'position',
    'sourceType',
    'nameType',
    'name_status_id',
    'notes',
    'activityLogs',
    'files',
    'nameStatus',
    'created_at',
    'updated_at',
    'created_by',
    'updated_by',
    'migration_record',
    'migration_record_changed',
    'convertion_date',
    'company_id',
    'employerCompanies',
    'shouldAskRecruiterAddEmployer',
  ]);
});

test('Should return 404 when creating an ActivityLog from an non existing Name', async ({ client, user, assert }) => {
  assert.plan(2);
  const response = await client
    .post(`${url}/names/-1/activityLogs/`)
    .loginVia(user, 'jwt')
    .send({
      body: '<h3>This is a name activity log</h3>',
      activity_log_type_id: activityLogTypes.SMS,
    })
    .end();
  response.assertStatus(404);
  response.assertJSONSubset({
    success: false,
    code: 404,
    message: 'Name record not found',
  });
});

test('Should return 201 when creating a Name-ActivityLog', async ({ client, user, assert }) => {
  const response = await client
    .post(`${url}/names/${name.id}/activityLogs/`)
    .loginVia(user, 'jwt')
    .send({
      body: '<h3>This is a Name activity log</h3>',
      activity_log_type_id: activityLogTypes.SMS,
    })
    .end();
  response.assertStatus(201);
  assert.containsAllKeys(response.body.data, [
    'id',
    'user_id',
    'user',
    'name_id',
    'activity_log_type_id',
    'created_by_system',
    'body',
    'activityLogType',
    'created_at',
    'updated_at',
    'bulkReference',
  ]);
  activityLog_id = response.body.data.id;
});

test('Should return 201 when updating a Name-ActivityLog', async ({ client, user, assert }) => {
  const response = await client
    .put(`${url}/names/${name.id}/activityLogs/${activityLog_id}`)
    .loginVia(user, 'jwt')
    .send({
      body: '<h3>This is a Name activity log</h3>',
      activity_log_type_id: activityLogTypes.Email,
    })
    .end();
  response.assertStatus(201);
  assert.containsAllKeys(response.body, [
    'id',
    'user_id',
    'user',
    'name_id',
    'activity_log_type_id',
    'body',
    'activityLogType',
    'created_by_system',
    'created_at',
    'updated_at',
  ]);
});

test('Should return 200 when deleting a Name-ActivityLog', async ({ client, user, assert }) => {
  const response = await client
    .delete(`${url}/names/${name.id}/activityLogs/${activityLog_id}`)
    .loginVia(user, 'jwt')
    .end();
  response.assertStatus(200);
});

test('Should return 404 when creating a note from an non existing Name', async ({ client, user, assert }) => {
  assert.plan(2);
  const response = await client
    .post(`${url}/names/-1/notes/`)
    .loginVia(user, 'jwt')
    .send({
      body: '<h3>This is a name note</h3>',
      title: 'Test Note',
    })
    .end();
  response.assertStatus(404);
  response.assertJSONSubset({
    success: false,
    code: 404,
    message: 'Name record not found',
  });
});

test('Should return 201 when creating a NameNote', async ({ client, user, assert }) => {
  const response = await client
    .post(`${url}/names/${name.id}/notes/`)
    .loginVia(user, 'jwt')
    .send({
      body: '<h3>This is a Name note</h3>',
      title: 'Title Test',
    })
    .end();

  response.assertStatus(201);
  assert.hasAllKeys(response.body.data, [
    'id',
    'user_id',
    'user',
    'name_id',
    'body',
    'title',
    'created_at',
    'updated_at',
  ]);
  note_id = response.body.data.id;
});

test('Should return 201 when updating a NameNote', async ({ client, user, assert }) => {
  const response = await client
    .put(`${url}/names/${name.id}/notes/${note_id}`)
    .loginVia(user, 'jwt')
    .send({
      body: '<h3>This is a test note</h3>',
      title: 'Title Test',
    })
    .end();
  response.assertStatus(201);
  assert.hasAllKeys(response.body, ['id', 'user_id', 'user', 'name_id', 'body', 'title', 'created_at', 'updated_at']);
});

test('Should return 200 when deleting a NameNote', async ({ client, user, assert }) => {
  const response = await client.delete(`${url}/names/${name.id}/notes/${note_id}`).loginVia(user, 'jwt').end();
  response.assertStatus(200);
});

test('Should return 400 when a File with an invalid extension is uploaded', async ({ client, user, assert }) => {
  assert.plan(1);
  const response = await client
    .post(`${url}/names/${name.id}/files`)
    .loginVia(user, 'jwt')
    .attach('file', Helpers.resourcesPath('BadFile.js'))
    .end();
  response.assertStatus(400);
});

test('Should return 201 when a File is uploaded', async ({ client, user }) => {
  const response = await client
    .post(`${url}/names/${name.id}/files`)
    .loginVia(user, 'jwt')
    .attach('file', Helpers.resourcesPath('Test_File.jpg'))
    .end();

  file_id = response.body.id;
  response.assertStatus(201);
});

test('Should return 200 when a File is deleted', async ({ client, user }) => {
  const response = await client.delete(`${url}/names/${name.id}/files/${file_id}`).loginVia(user, 'jwt').end();
  response.assertStatus(200);
});

test('Should return 201 when adding a employer company to a name', async ({ client, user, assert }) => {
  const response = await client
    .post(`${url}/names/${name.id}/employer-company`)
    .loginVia(user, 'jwt')
    .send({
      company_id: employeerCompany.id,
    })
    .end();
  response.assertStatus(201);
});

test('Should return 200 when listing the employees from a company', async ({ client, user, assert }) => {
  const filter = '?page=1&perPage=10';
  const response = await client.get(`${url}/companies/${employeerCompany.id}/employees${filter}`).loginVia(user, 'jwt').end();
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

test('Should return 200 when the suggestion endpoint is requested', async ({ client, user }) => {
  const response = await client.get(`${url}/names/${nameWithOldCompany.id}/suggested-companies`).loginVia(user, 'jwt').end();
  response.assertStatus(200);
});

after(async () => {
  if (name) {
    name && (await CompanyHasNameEmployee.query().where('name_id', name.id).delete());
    await name.delete();
    await personalInformation.delete();
    await contact.delete();
    await address.delete();
  }
});
