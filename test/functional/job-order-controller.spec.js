'use strict';

const { test, trait, after, before } = use('Test/Suite')('Job Orders');
const Event = use('Event');
const Company = use('App/Models/Company');
const City = use('App/Models/City');
const Position = use('App/Models/Position');
const JobOrder = use('App/Models/JobOrder');
const WhiteSheet = use('App/Models/WhiteSheet');
const Address = use('App/Models/Address');
const ZipCode = use('App/Models/ZipCode');
const JobOrderOperatingMetric = use('App/Models/JobOrderOperatingMetric');
const { JobOrderStatusSchemes, JobOrderTypeSchemes, activityLogTypes, JobOrderSourceURLTypes } = use('App/Helpers/Globals');
const url = 'api/v1';
const Helpers = use('Helpers');
const JobOrderHasHiringAuthority = use('App/Models/JobOrderHasHiringAuthority');
const JobOrderRecruiterAssignment = use('App/Models/JobOrderRecruiterAssignment');

trait('Test/ApiClient');
trait('Auth/Client');
trait('Test/Traits/User');


let position;
let company;
let hiringAuthorities;
let city;
let zipCode;
let jobOrder;
let whiteSheet;
let address;
let jobOrderFile;
let jobOrderNote_id;
let activityLog_id;
let specialty;

const createUtils = async () => {
  company = await Company.firstOrFail();
  specialty = await company.specialty().fetch();
  position = await Position.firstOrFail();
  hiringAuthorities = await company.hiringAuthorities().fetch();
  city = await City.find(company.city_id);
  zipCode = company.zip;
};

before(async () => {
  Event.fake();
});

test('Should return 401 when not sending a token', async ({ assert, client }) => {
  assert.plan(1);
  const response = await client.post(`${url}/job-orders`).end();
  response.assertStatus(401);
});

test('Should return 201 when creating a JobOrder', async ({ client, user }) => {
  await createUtils();
  const response = await client
    .post(`${url}/job-orders`)
    .loginVia(user, 'jwt')
    .send({
      company_id: company.id,
      title: 'Test JobOrder',
      specialty_id: specialty.id,
      position_id: position.id,
      status_id: JobOrderStatusSchemes.Ongoing,
      source: 'https://domain-test.com',
      job_order_source_type_id : JobOrderSourceURLTypes.LinkedIn.id,
      different_location: 1,
      city_id: city.id,
      zip: zipCode,
      hiring_authority_id: hiringAuthorities.rows[0].id,
      whiteSheet: {
        job_order_type_id: JobOrderTypeSchemes.SearchAssignment,
        discussing_agreement_complete: 1,
        fee_agreement_percent: 50,
        time_position_open: '2017-07-27',
        position_filled: '2020-04-23T15:00:00.000Z',
        minimum_compensation: 1000,
        good_compensation: 1500,
        maximum_compensation: 2000,
        benefits: 'Medical Insurance',
        background_requirements: 'Experience using HTML,CSS and JS',
        preset_interview_dates: ['2020-04-21T17:44:45.463Z'],
        notes:'Test Note',
        work_type_option_id: 1,
        warranty_time_in_days: 30,
        company_prepared_to_sign_service_agreement : true,
        company_prepared_to_interview_asap: true
      },
    })
    .end();
  response.assertStatus(201);
  response.assertJSONSubset({
    success: true,
    message: 'Job order created successfull',
    data: {
      company_id: company.id,
      position_id: position.id,
      title: 'Test JobOrder',
      source: 'https://domain-test.com',
      hot_item: 1,
      different_location: 1,
      created_by: user.id,
      updated_by: user.id,
      recruiter_id: user.id,
    },
  });

  jobOrder = await JobOrder.find(response.body.data.id);
  whiteSheet = await WhiteSheet.findBy('job_order_id', jobOrder.id);
  address = await Address.find(jobOrder.address_id);
});

test('Should return 200 and a pagination object of JobOrders', async ({ client, user, assert }) => {
  const response = await client
    .get(`${url}/job-orders`)
    .loginVia(user, 'jwt')
    .send({
      mine: 1,
    })
    .end();

  response.assertStatus(200);
  assert.containsAllKeys(response.body, ['total','perPage','page','data','lastPage'])
});

test('Should return 200 when listing Job Order statuses', async ({ client, user, assert }) => {
  const response = await client
    .get(`${url}/job-orders/statuses`)
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

test('Should return 200 and only selectable Job Order statuses when selectable is true', async ({
  client,
  user,
  assert,
}) => {
  const response = await client
    .get(`${url}/job-orders/statuses`)
    .loginVia(user, 'jwt')
    .send({ selectable: 'true' })
    .end();

  response.assertStatus(200);
  assert.isArray(response.body);
  assert.notEqual(response.body.length, 0);

  response.body.forEach(item => assert.propertyVal(item, 'selectable', true , 'All JO statuses should be selectable'));

});

test('Should return 404 when a JobOrder is Not Found', async ({ client, user, assert }) => {
  assert.plan(1);
  const response = await client.get(`${url}/job-orders/-1`).loginVia(user, 'jwt').end();

  response.assertStatus(404);
});

test('Should return 400 when a Bad ID is Sent', async ({ client, user, assert }) => {
  assert.plan(1);
  const response = await client.get(`${url}/job-orders/BadID`).loginVia(user, 'jwt').end();
  response.assertStatus(400);
});

test('Should return 200 when a JobOrder Profile is Requested', async ({ client, user, assert }) => {
  const response = await client.get(`${url}/job-orders/${jobOrder.id}`).loginVia(user, 'jwt').end();
  response.assertStatus(200);
  assert.hasAnyKeys(response.body, [
    'id',
    'title',
    'start_date',
    'source',
    'open_since',
    'hot_item',
    'hot_item_date',
    'different_location',
    'created_at',
    'updated_at',
    'created_by',
    'updated_by',
    'recruiter_id',
    'recruiter',
    'company',
    'position',
    'address',
    'hiringAuthorities',
    'whiteSheet',
    'files',
    'notes',
    'activityLogs',
    'specialty',
    'subspecialty',
    'candidates',
    'last_activity_date',
    'coach',
    'createdBy',
    'status',
  ]);

});

test('Should return 404 when sending a non existing JobOrder on Update', async ({ client, user, assert }) => {
  assert.plan(2);
  const response = await client
    .put(`${url}/job-orders/-1`)
    .loginVia(user, 'jwt')
    .send({
      company_id: company.id,
      title: 'Updated Test JobOrder',
      specialty_id: specialty.id,
      position_id: position.id,
      source: 'https://updated-domain-test.com',
      job_order_source_type_id : JobOrderSourceURLTypes.LinkedIn.id,
      different_location: 0,
    })
    .end();
  response.assertStatus(404);
  response.assertJSONSubset({
    success: false,
    code: 404,
    message: 'JobOrder not Found',
  });
});

test('Should return 400 when the zip code and city does not match', async ({ client, user, assert }) => {
  assert.plan(2);
  const zip = await ZipCode.query().where('zip', '!=', zipCode).first();
  const response = await client
    .put(`${url}/job-orders/${jobOrder.id}`)
    .loginVia(user, 'jwt')
    .send({
      company_id: company.id,
      title: 'Updated Test JobOrder',
      specialty_id: specialty.id,
      position_id: position.id,
      source: 'https://updated-domain-test.com',
      job_order_source_type_id : JobOrderSourceURLTypes.LinkedIn.id,
      different_location: 1,
      zip: zipCode,
      city_id: zip.city_id,
    })
    .end();
  response.assertStatus(400);
  response.assertJSONSubset({
    success: false,
    code: 400,
    message: "The zip code doesn't exist in the selected city",
  });
});

test('Should return 201 when updating the JobOrder', async ({ client, user, assert }) => {
  const response = await client
    .put(`${url}/job-orders/${jobOrder.id}`)
    .loginVia(user, 'jwt')
    .send({
      company_id: company.id,
      title: 'Updated Test JobOrder',
      specialty_id: specialty.id,
      position_id: position.id,
      source: 'https://updated-domain-test.com',
      job_order_source_type_id : JobOrderSourceURLTypes.LinkedIn.id,
      different_location: 0,
      company_prepared_to_sign_service_agreement: true,
      company_prepared_to_interview_asap: true
    })
    .end();
  response.assertStatus(201);
  assert.hasAnyKeys(response.body, [
    'id',
    'title',
    'start_date',
    'source',
    'open_since',
    'hot_item',
    'hot_item_date',
    'different_location',
    'created_at',
    'updated_at',
    'created_by',
    'updated_by',
    'recruiter_id',
    'recruiter',
    'company',
    'position',
    'address',
    'hiringAuthorities',
    'whiteSheet',
    'files',
    'notes',
    'activityLogs',
    'specialty',
    'subspecialty',
    'candidates',
    'last_activity_date',
    'coach',
    'createdBy'
  ]);
  response.assertJSONSubset({
    id: jobOrder.id,
    title: 'Updated Test JobOrder',
    source: 'https://updated-domain-test.com',
    hot_item: 1,
    different_location: 0,
    created_by: jobOrder.created_by,
    updated_by: jobOrder.updated_by,
    recruiter_id: jobOrder.recruiter_id,
  });
});

test('Should return 400 when a File with an invalid extension is uploaded', async ({ client, user, assert }) => {
  assert.plan(2);
  const response = await client
    .post(`${url}/job-orders/${jobOrder.id}/files`)
    .loginVia(user, 'jwt')
    .attach('file', Helpers.resourcesPath('BadFile.js'))
    .end();
  response.assertStatus(400);
  response.assertError({
    message: { error: 'Invalid file extension js. Only jpg, JPG, jpeg, JPEG, png, PNG, pdf, PDF, doc, DOC, docx, DOCX, ppt, PPT, pptx, PPTX, xlsx, XLSX, csv, CSV, xls, XLS are allowed' },
  });
});

test('Should return 201 when a File is uploaded', async ({ client, user }) => {
  const response = await client
    .post(`${url}/job-orders/${jobOrder.id}/files`)
    .loginVia(user, 'jwt')
    .attach('file', Helpers.resourcesPath('Test_File.jpg'))
    .end();

  jobOrderFile = response.body;
  response.assertStatus(201);
});

test('Should return 200 when a File is deleted', async ({ client, user }) => {
  const response = await client
    .delete(`${url}/job-orders/${jobOrder.id}/files/${jobOrderFile.id}`)
    .loginVia(user, 'jwt')
    .end();
  response.assertStatus(200);
});

test('Should return 404 when creating a note from an non existing JobOrder', async ({ client, user, assert }) => {
  assert.plan(2);
  const response = await client
    .post(`${url}/job-orders/-1/notes/`)
    .loginVia(user, 'jwt')
    .send({
      body:'<h3>This is a job-order-test note</h3>',
      title:'Test Note'
    })
    .end();
  response.assertStatus(404);
  response.assertJSONSubset({
    success: false,
    code: 404,
    message: "jobOrder not found" 
  });
});

test('Should return 201 when creating a JobOrderNote', async ({ client, user, assert }) => {
  const response = await client
    .post(`${url}/job-orders/${jobOrder.id}/notes/`)
    .loginVia(user, 'jwt')
    .send({
      body:'<h3>This is a job-order-test note</h3>',
      title:'Title Test'
    })
    .end();
  
  response.assertStatus(201);
  assert.containsAllKeys(response.body.data,['id','user_id','user','job_order_id','body','title','created_at','updated_at'])
  jobOrderNote_id = response.body.data.id
});


test('Should return 201 when updating a JobOrderNote', async ({ client, user, assert }) => {
  const response = await client
    .put(`${url}/job-orders/${jobOrder.id}/notes/${jobOrderNote_id}`)
    .loginVia(user, 'jwt')
    .send({
      body:'<h3>This is a test note</h3>',
      title:'Title Test'
    })
    .end();
  response.assertStatus(201);
  assert.containsAllKeys(response.body,['id','user_id','user','job_order_id','body','title','created_at','updated_at'])
});

test('Should return 200 when deleting a JobOrderNote', async ({ client, user, assert }) => {
  const response = await client
    .delete(`${url}/job-orders/${jobOrder.id}/notes/${jobOrderNote_id}`)
    .loginVia(user, 'jwt')
    .end();
  response.assertStatus(200);
});

test('Should return 404 when creating an ActivityLog from an non existing JobOrder', async ({ client, user, assert }) => {
  assert.plan(2);
  const response = await client
    .post(`${url}/job-orders/-1/activityLogs/`)
    .loginVia(user, 'jwt')
    .send({
      body:'<h3>This is a job-order-test activity log</h3>',
      activity_log_type_id:activityLogTypes.SMS
    })
    .end();
  response.assertStatus(404);
  response.assertJSONSubset({
    success: false,
    code: 404,
    message: 'JobOrder not found' 
  });
});

test('Should return 201 when creating a JobOrder-ActivityLog', async ({ client, user, assert }) => {
  const response = await client
    .post(`${url}/job-orders/${jobOrder.id}/activityLogs/`)
    .loginVia(user, 'jwt')
    .send({
      body:'<h3>This is a job-order-test activity log</h3>',
      activity_log_type_id:activityLogTypes.SMS
    })
    .end();
  response.assertStatus(201);
  assert.containsAllKeys(response.body.data,['id','user_id','user','job_order_id','activity_log_type_id','body','activityLogType','created_at','updated_at'])
  activityLog_id = response.body.data.id
});


test('Should return 201 when updating a JobOrder-ActivityLog', async ({ client, user, assert }) => {
  const response = await client
    .put(`${url}/job-orders/${jobOrder.id}/activityLogs/${activityLog_id}`)
    .loginVia(user, 'jwt')
    .send({
      body:'<h3>This is a job-order-test activity log</h3>',
      activity_log_type_id:activityLogTypes.Email
    })
    .end();
  response.assertStatus(201);
  assert.containsAllKeys(response.body,['id','user_id','user','job_order_id','activity_log_type_id','body','activityLogType','created_at','updated_at'])
});

test('Should return 200 when deleting a JobOrder-ActivityLog', async ({ client, user, assert }) => {
  const response = await client
    .delete(`${url}/job-orders/${jobOrder.id}/activityLogs/${activityLog_id}`)
    .loginVia(user, 'jwt')
    .end();
  response.assertStatus(200);
});

after(async () => {
  if(jobOrder){
    await whiteSheet.delete();
    await JobOrderHasHiringAuthority.query().where('job_order_id',jobOrder.id).delete();
    await JobOrderRecruiterAssignment.query().where('job_order_id',jobOrder.id).delete();
    await jobOrder.delete();
    await address.delete();
  }
});
