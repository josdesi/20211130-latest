'use strict';
//Test
const { test, trait, after, before } = use('Test/Suite')('Placements');
const Event = use('Event');

//Utils
const { SendoutStatusSchemes, userPermissions, userRoles, CandidateSourceURLTypes, JobOrderSourceURLTypes } = use('App/Helpers/Globals');
const { placementStatus } = use('App/Utils/PlacementUtils');
const { types } = use('App/Helpers/FileType');
const { filter } = use('lodash');
const { deleteServerFile, } = use('App/Helpers/FileHelper');
const Sendout = use('App/Models/Sendout');
const Antl = use('Antl');
const url = 'api/v1';
const Helpers = use('Helpers');
const moment = use('moment');
const modulePlacementFiles = filter(types, { _module: 'placement' });
const requiredFiles = [...filter(modulePlacementFiles, { _required: true }), types.REFERENCE_RELEASE_EMAIL];
const Database = use('Database');

//Models
const UserHasPermission = use('App/Models/UserHasPermission');
const UserHasRole = use('App/Models/UserHasRole');

//Traits
trait('Test/ApiClient');
trait('Auth/Client');
trait('Test/Traits/User');

let sendout;
let userPlacementPermission;
let userFinanceRole;
let fileTest;
let requiredFilesTest;
let placement;
let invoice;
let payment;

const placementData = {
  fee_agreement_payment_scheme_id: 'standard',
  fee_amount: 10000,
  fee_percentage: 20,
  service_months: 12,
  first_year_value: 100000,
  start_date: moment(),
  guarantee_days: 30,
};

before(async () => {
  Event.fake();
});

const setupTest = async (client, user) => {
  sendout = await Sendout.query()
    .whereIn('sendout_status_id', [SendoutStatusSchemes.Active, SendoutStatusSchemes.Placed])
    .orderBy('id', 'desc')
    .first();
  placementData.sendout_id = sendout.id;
  await addPermissionToUser(user.id, userPermissions.placements.usage);
};

const addPermissionToUser  = async (userId, permissionId) => {
  userPlacementPermission = await UserHasPermission.findOrCreate(
    { user_id: userId, permission_id: permissionId }
  );
}

const addRoleToUser  = async (userId, roleId) => {
  userFinanceRole = await UserHasRole.findOrCreate(
    { user_id: userId, role_id: roleId }
  );
}

test('Should return 401 when not sending a token', async ({ assert, client }) => {
  assert.plan(1);
  const response = await client.post(`${url}/placements`).end();
  response.assertStatus(401);
});

test('Should return 201 when Temporal Files are uploaded', async ({ client, user }) => {
  const request = client
    .post(`${url}/files`)
    .loginVia(user, 'jwt');
  requiredFiles.forEach(() => {
    request.attach('file', Helpers.resourcesPath('Test_File.jpg'))
  })
  const response = await request.end();
  requiredFilesTest = requiredFiles.map((type, index) => {
    return {
      entity:"placement",
      type_id: type._id,
      id: response.body[index].id
    }
  });
  response.assertStatus(200);
});

test('Should return 400 if repeated split user when creating a placement', async ({ client, user }) => {
  await setupTest(client, user);
  const response = await client
    .post(`${url}/placements`)
    .loginVia(user, 'jwt')
    .send({
      ...placementData,
      splits: [
        {
          type: 'company',
          user_id: sendout.job_order_accountable_id,
          is_channel_partner: 0,
          percent: 95,
        },
        {
          type: 'company',
          user_id: sendout.job_order_accountable_id,
          is_channel_partner: 0,
          percent: 5,
        },
      ],
      files: requiredFilesTest,
      source_type_id: CandidateSourceURLTypes.Monster.id,
      job_order_source_type_id: JobOrderSourceURLTypes.LinkedIn.id
    })
    .end();
  response.assertStatus(400);
  response.assertError({
    success: false,
    code: 400,
    message:  Antl.formatMessage('messages.validation.splitRepeatedUser', { type: 'company' }),
  });
});

test('Should return 400 if split total does not sum up to 100 when creating a placement', async ({ client, user }) => {
  const response = await client
    .post(`${url}/placements`)
    .loginVia(user, 'jwt')
    .send({
      ...placementData,
      splits: [
        {
          type: 'company',
          user_id: sendout.job_order_accountable_id,
          is_channel_partner: 0,
          percent: 101,
        }
      ],
      files: requiredFilesTest,
      source_type_id: CandidateSourceURLTypes.Monster.id,
      job_order_source_type_id: JobOrderSourceURLTypes.LinkedIn.id
    })
    .end();
  response.assertStatus(400);
  response.assertError({
    success: false,
    message: Antl.formatMessage('messages.validation.splitPercent', { total: 100 }),
    code: 400,
  });
});

test('Should return 201 when creating a placement', async ({ client, user }) => {
  const response = await client
    .post(`${url}/placements`)
    .loginVia(user, 'jwt')
    .send({
      ...placementData,
      splits: [
        {
          type: 'company',
          user_id: sendout.job_order_accountable_id,
          is_channel_partner: 0,
          percent: 100,
        }
      ],
      files: requiredFilesTest,
      source_type_id: CandidateSourceURLTypes.Monster.id,
      job_order_source_type_id: JobOrderSourceURLTypes.LinkedIn.id
    })
    .end();
  placement = response.body.data;
  response.assertStatus(201);
  response.assertJSONSubset({
    data: {
      status:{
        id: placementStatus.Pending_To_Invoiced._id
      }
    }
  });
});

test('Should return 200 when requesting a placement', async ({ client, user }) => {
  const response = await client
    .get(`${url}/placements/${placement.id}`)
    .loginVia(user, 'jwt')
    .end();
  placement = response.body;
  response.assertStatus(200);
});

test('Should return 201 when updating a placement', async ({ client, user }) => {
  const response = await client
    .put(`${url}/placements/${placement.id}`)
    .loginVia(user, 'jwt')
    .send({
      ...placementData,
      splits: [
        {
          type: 'company',
          user_id: sendout.job_order_accountable_id,
          is_channel_partner: 0,
          percent: 100,
        }
      ],
      files: [],
      source_type_id: CandidateSourceURLTypes.Monster.id,
      job_order_source_type_id: JobOrderSourceURLTypes.LinkedIn.id
    })
    .end();
  response.assertStatus(201);
  response.assertJSONSubset({
    status:{
      id: placementStatus.Pending_To_Invoiced._id
    }
  });
});

test('Should return 200 when retrieving all placements', async ({ client, user, assert }) => {
  const response = await client
    .get(`${url}/placements`)
    .loginVia(user, 'jwt')
    .send({
      page: 1
    })
    .end();

  response.assertStatus(200);
  assert.containsAllKeys(response.body, ['total','perPage','page','data','lastPage']);
});


test('Should return 201 when adding an invoice to a placement', async ({ client, user }) => {
  await addRoleToUser(user.id, userRoles.Finance);
  const response = await client
    .post(`${url}/placements/${placement.id}/invoices`)
    .loginVia(user, 'jwt')
    .send({
      invoice_number: 1,
    })
    .end();
  invoice = response.body.data;
  response.assertStatus(201);
  response.assertJSONSubset({
    success: true,
    data: {
      number: 1,
      placement_id: placement.id,
      created_by: user.id,
      updated_by: user.id,
    },
  });
});

test('Should return 201 when updating an invoice', async ({ client, user }) => {
  const response = await client
    .patch(`${url}/placements/${placement.id}/invoices/${invoice.id}`)
    .loginVia(user, 'jwt')
    .send({
      invoice_number: 2,
    })
    .end();
  response.assertStatus(201);
  response.assertJSONSubset({
    success: true,
    data: {
      number: 2,
      placement_id: placement.id,
      created_by: user.id,
      updated_by: user.id,
    },
  });
});

test('Should return 200 when deleting an invoice', async ({ client, user }) => {
  const response = await client
    .delete(`${url}/placements/${placement.id}/invoices/${invoice.id}`)
    .loginVia(user, 'jwt')
    .end();
  response.assertStatus(200);
});


test('Should return 201 when adding a payment to a placement', async ({ client, user }) => {
  const response = await client
    .post(`${url}/placements/${placement.id}/payments`)
    .loginVia(user, 'jwt')
    .send({
      amount: 10000,
    })
    .end();
  payment = response.body.data;
  response.assertStatus(201);
  response.assertJSONSubset({
    success: true,
    data: {
      amount: 10000,
      placement_id: placement.id,
      created_by: user.id,
      updated_by: user.id,
    },
  });
});

test('Should return 201 when updating a payment', async ({ client, user }) => {
  const response = await client
    .patch(`${url}/placements/${placement.id}/payments/${payment.id}`)
    .loginVia(user, 'jwt')
    .send({
      amount: 15000,
    })
    .end();
  response.assertStatus(201);
  response.assertJSONSubset({
    success: true,
    data: {
      amount: 15000,
      placement_id: placement.id,
      created_by: user.id,
      updated_by: user.id,
    },
  });
});

test('Should return 200 when deleting a payment', async ({ client, user }) => {
  const response = await client
    .delete(`${url}/placements/${placement.id}/payments/${payment.id}`)
    .loginVia(user, 'jwt')
    .end();
  response.assertStatus(200);
});

after(async () => {
  const { id, files = [] } = placement;
  userPlacementPermission && await userPlacementPermission.delete();
  userFinanceRole && await userFinanceRole.delete();
  if(files.length > 0){
    files.forEach(file => {
      deleteServerFile(file.url);
    });
  }
  if(id){
    await Database.transaction(async trx => {
      try {
        await trx.table('placement_has_files').where('placement_id', id).del();
        await trx.table('placement_splits').where('placement_id', id).del();
        await trx.table('placements').where('id', id).del();
        await trx.commit();
      } catch (error) {
        await trx.rollback();
        throw error;
      }
    })
  }
});


