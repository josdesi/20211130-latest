'use strict';

const { test, trait, before, after } = use('Test/Suite')('Companies');
const Helpers = use('Helpers');
const Database = use('Database');
const Event = use('Event');
const url = 'api/v1';

const Company = use('App/Models/Company');
const Candidate = use('App/Models/Candidate');
const Name = use('App/Models/Name');
const Contact = use('App/Models/Contact');
const ZipCode = use('App/Models/ZipCode');
const HiringAuthority = use('App/Models/HiringAuthority');
const User = use('App/Models/User');
const CompanyRecruiterAssignment = use('App/Models/CompanyRecruiterAssignment');
const CompanyChangeLog = use('App/Models/CompanyChangeLog');
const CompanyHasCandidateEmployee = use('App/Models/CompanyHasCandidateEmployee');
const CompanyHasNameEmployee = use('App/Models/CompanyHasNameEmployee');

const companyKeys = [
  'id',
  'name',
  'email',
  'website',
  'link_profile',
  'fee_agreement_url',
  'created_at',
  'file_name',
  'migration_record',
  'migration_record_changed',
  'last_activity_date',
  'signed',
  'specialty',
  'subspecialty',
  'contact',
  'address',
  'recruiter',
  'hiringAuthorities',
  'jobOrders',
  'notes',
  'activityLogs',
  'coach',
  'companyTypeReassure',
  'migration_source_type_id'
];

const newCompanyKeys = [
  'contact_id',
  'recruiter_id',
  'name',
  'email',
  'website',
  'link_profile',
  'created_by',
  'fee_agreement_url',
  'file_name',
  'updated_by',
  'specialty_id',
  'subspecialty_id',
  'created_at',
  'updated_at',
  'id',
];

const dummyHA = {
  first_name: 'Test first',
  last_name: 'Test last',
  title: 'Test title',
  personal_email: '',
  personal_phone: '',
  work_email: `${(new Date().getTime())}@test.com`,
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
  email: `${(new Date().getTime())}@test.com`,
  company_address: 'Company address',
  website: 'https://domain-test.com',
  link_profile: 'https://profile-test.com',
  hiringAuthorities: [dummyHA],
};

const dummyCompanyWithOutHA = {
  name: 'Test Company 2',
  specialty_id: '1',
  subspecialty_id: '',
  city_id: '51086',
  zip: '37545',
  phone: '1234567890',
  ext: '123',
  email: `${(new Date().getTime())}@test2.com`,
  company_address: 'Company address',
  website: 'https://domain-test.com',
  link_profile: 'https://profile-test.com',
};

const dummyCompanyWithEmployees= {
  name: 'Test Company 2',
  specialty_id: '1',
  subspecialty_id: '',
  city_id: '51086',
  zip: '37545',
  phone: '1234567890',
  ext: '123',
  email: `${(new Date().getTime())}@test3.com`,
  company_address: 'Company address',
  website: 'https://domain-test.com',
  link_profile: 'https://profile-test.com',
  candidate_ids: [],
  name_ids: [],
};

trait('Test/ApiClient');
trait('Auth/Client');
trait('Test/Traits/User');

let company;
let contact;
let address;
let hiringAuthority;
let companyWithoutHA;
let contactWithoutHA;
let companyWithEmployees;
let contactWithEmployees;
let userTestId;

const deleteCompany = async (id) => {
  const theCompany = await Company.find(id);

  await CompanyChangeLog.query().where('company_id', theCompany.id).delete();
  await HiringAuthority.query().where('company_id', theCompany.id).delete();
  await CompanyRecruiterAssignment.query().where('company_id', theCompany.id).delete();
  await theCompany.delete();
  await Contact.query().where('id', theCompany.contact_id).delete();
  
};

before(async () => {
  const candidate = await Candidate.query()
    .whereNot('id', 0)
    .first(); //firsrOrFailt return candidate 0, alpha?
  const name = await Name.query()
    .whereNot('id', 0)
    .first(); //firsrOrFailt return candidate 0, alpha?
  dummyCompanyWithEmployees.candidate_ids.push(candidate.id)
  dummyCompanyWithEmployees.name_ids.push(name.id)
  Event.fake();
});

test('Should return 401 when not sending a token authentication', async ({ assert, client }) => {
  assert.plan(1);
  const response = await client.post(`${url}/companies`).end();
  response.assertStatus(401);
});

test('Should return 201 and retrieva all keys when creating a new Company', async ({ assert, client, user }) => {
  const response = await client.post(`${url}/companies`).loginVia(user, 'jwt').send(dummyCompany).end();
  response.assertStatus(201);
  response.assertJSONSubset({
    success: true,
    message: 'Company created successfull',
    data: response.body.data,
  });
  assert.containsAllKeys(response.body.data, newCompanyKeys);

  company = await Company.find(response.body.data.id);
  contact = await Contact.find(company.contact_id);
  hiringAuthority = await HiringAuthority.findBy('company_id', company.id);
  userTestId = user.id;
});

test('Should return 201 when creating a company without Hiring Authority', async ({ assert, client, user }) => {
  const response = await client.post(`${url}/companies`).loginVia(user, 'jwt').send(dummyCompanyWithOutHA).end();
  response.assertStatus(201);
  assert.containsAllKeys(response.body.data, newCompanyKeys);

  companyWithoutHA = await Company.find(response.body.data.id);
  contactWithoutHA = await Contact.find(companyWithoutHA.contact_id);
});

test('Should return 201 when creating a company with employees already in', async ({ assert, client, user }) => {
  const response = await client.post(`${url}/companies`).loginVia(user, 'jwt').send(dummyCompanyWithEmployees).end();
  response.assertStatus(201);
  assert.containsAllKeys(response.body.data, newCompanyKeys);

  companyWithEmployees = await Company.find(response.body.data.id);
  contactWithEmployees = await Contact.find(companyWithEmployees.contact_id);
});


test('Should return 400 when company email exists', async ({ assert, client, user }) => {
  const response = await client.post(`${url}/companies`).loginVia(user, 'jwt').send(dummyCompany).end();

  response.assertStatus(400);
});

test('Should return 400 when HA work email exists', async ({ assert, client, user }) => {
  const aCompany = { ...dummyCompany, email: `${new Date().getTime()}-john@gorillamail.com` };
  const response = await client.post(`${url}/companies`).loginVia(user, 'jwt').send(aCompany).end();

  response.assertStatus(400);
});

test('Should return 201 if HA personal email is empty string', async ({ assert, client, user }) => {
  const aCompany = { ...dummyCompany, email: `${new Date().getTime()}-john@gorillamail.com` };
  const response = await client
    .post(`${url}/companies`)
    .loginVia(user, 'jwt')
    .send({
      ...aCompany,
      hiringAuthorities: [{ ...dummyHA, work_email: `${new Date().getTime()}-pete@gorillamail.com`, personal_email: '' }],
    })
    .end();
  response.assertStatus(201);
  
  await deleteCompany(response.body.data.id);
});

test('Should return 201 if HA personal email is null', async ({ assert, client, user }) => {
  const aCompany = { ...dummyCompany, email: `${new Date().getTime()}-john@gorillamail.com` };
  const response = await client
    .post(`${url}/companies`)
    .loginVia(user, 'jwt')
    .send({
      ...aCompany,
      hiringAuthorities: [{ ...dummyHA, work_email: `${new Date().getTime()}-pete@gorillamail.com`, personal_email: null }],
    })
    .end();
  response.assertStatus(201);

  await deleteCompany(response.body.data.id);
});

test('Should return 200 and a pagination object of Companies', async ({ client, user, assert }) => {
  const response = await client
    .get(`${url}/companies`)
    .loginVia(user, 'jwt')
    .send({
      mine: 1,
    })
    .end();
    response.assertStatus(200);
  assert.containsAllKeys(response.body, ['total', 'perPage', 'page', 'data', 'lastPage']);
});

test('Should return 404 when a Company is not found', async ({ client, user, assert }) => {
  assert.plan(1);
  const response = await client.get(`${url}/companies/-1`).loginVia(user, 'jwt').end();

  response.assertStatus(404);
});

test('Should return 400 when a bad Company ID is sent', async ({ client, user, assert }) => {
  assert.plan(1);
  const response = await client.get(`${url}/companies/aa`).loginVia(user, 'jwt').end();
  response.assertStatus(400);
});

test('Should return 200 and retrieve all keys when a Company profile is requested', async ({
  client,
  user,
  assert,
}) => {
  const response = await client.get(`${url}/companies/${company.id}`).loginVia(user, 'jwt').end();
  response.assertStatus(200);
  assert.hasAnyKeys(response.body, companyKeys);
});

test('Should return 400 when the zip code and city does not match', async ({ client, user, assert }) => {
  assert.plan(2);
  const zip = await ZipCode.query().where('zip', '!=', dummyCompany.zip).first();
  const response = await client
    .put(`${url}/companies/${company.id}`)
    .loginVia(user, 'jwt')
    .send({
      name: 'Test Update Company',
      specialty_id: '1',
      subspecialty_id: '',
      city_id: zip.city_id,
      zip: dummyCompany.zip,
      phone: '1234567890',
      ext: '123',
      email: `${(new Date().getTime())}@test.com`,
      company_address: 'Company address',
      website: 'https://domain-test.com',
      link_profile: 'https://profile-test.com',
    })
    .end();

  response.assertStatus(400);
  response.assertJSONSubset({
    success: false,
    code: 400,
    message: "The zip code doesn't exist in the selected city",
  });
});

test('Should return 201 and retrieve all keys when updating the Company', async ({ client, user, assert }) => {
  const newEmail = `${(new Date().getTime())}@test.com`;
  const response = await client
    .put(`${url}/companies/${company.id}`)
    .loginVia(user, 'jwt')
    .send({
      name: 'Test Update Company',
      specialty_id: '1',
      subspecialty_id: '',
      city_id: '602',
      zip: '36103',
      phone: '1234567890',
      ext: '123',
      email: newEmail,
      company_address: 'Company address',
      website: 'https://domain-test.com',
      link_profile: 'https://profile-test.com',
    })
    .end();
  response.assertStatus(201);
  assert.hasAnyKeys(response.body, companyKeys);
  response.assertJSONSubset({
    id: company.id,
    name: 'Test Update Company',
    email: newEmail,
    website: 'https://domain-test.com',
    link_profile: 'https://profile-test.com',
  });
});

test('Should return 400 when reassigning company and no recruiter provided', async ({ assert, client, user }) => {
  const response = await client.put(`${url}/companies/reassign/${company.id}`).loginVia(user, 'jwt').send({}).end();

  response.assertStatus(400);
});

test('Should return 200 when reassigning a company', async ({ assert, client, user }) => {
  const coach = await User.findBy('email', 'coach@test.com');
  const anotherRecruiter = await User.findOrCreate({ email: 'user2@test.com' });

  const response = await client
    .put(`${url}/companies/reassign/${company.id}`)
    .loginVia(coach, 'jwt')
    .send({ recruiterId: anotherRecruiter.id })
    .end();

  response.assertStatus(200);
  assert.containsAllKeys(response.body, ['id', 'email', 'personalInformation']);

  await CompanyRecruiterAssignment.query().where('company_id', company.id).delete();
});

test('Should return 200 when possibles employees are requested', async ({ client, user, assert }) => {
  const filter = `?keyword=example&limit=6&company_id=${company.id}`;
  const response = await client.get(`${url}/companies/possible-employees${filter}`).loginVia(user, 'jwt').end();
  response.assertStatus(200);
  assert.hasAllKeys(response.body[0], ['id', 'email', 'is_name', 'full_name', 'found']);
});

after(async () => {
  hiringAuthority && (await hiringAuthority.delete());
  
  company && await deleteCompany(company.id);
  companyWithoutHA && await deleteCompany(companyWithoutHA.id);

  await CompanyChangeLog.query().where('created_by', userTestId).delete();

  contact && (await contact.delete());
  contactWithoutHA && (await contactWithoutHA.delete());

  await CompanyHasCandidateEmployee.query().where('created_by', userTestId).delete();
  await CompanyHasNameEmployee.query().where('created_by', userTestId).delete();

  companyWithEmployees && await deleteCompany(companyWithEmployees.id);

  contactWithEmployees && (await contactWithEmployees.delete());
});
