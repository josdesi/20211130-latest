'use strict';

const { test, trait, before, after } = use('Test/Suite')('Email Tracking Block List');

trait('Test/ApiClient');
trait('Auth/Client');
trait('Test/Traits/User');

//Utils
const Database = use('Database');

//Constants
const BASE_URL = 'api/v1';
const MODULE_URL = `${BASE_URL}/email-tracking-block`;
const EMAIL_RANDOM = `ThisDoesNotExist${Date.now()}@test.com`;
const EMAIL_MALFORMED = `ThisDoesNotExist${Date.now()}.com`;
const BASE_RESPONSE_FIELDS = [
  'id',
  'created_at',
  'updated_at',
  'email',
  'block_to',
  'block_from',
  'notes',
  'created_by',
];

//Object References
let emailBlockRuleId;

before(async () => {});

test('Should return 201 when creating a Email Block Rule', async ({ client, assert, user }) => {
  const response = await client
    .post(`${MODULE_URL}`)
    .loginVia(user, 'jwt')
    .send({
      email: EMAIL_RANDOM,
      to: true,
      from: true,
      notes: 'Unit testing',
    })
    .end();

  response.assertStatus(201);
  assert.containsAllKeys(response.body, BASE_RESPONSE_FIELDS);

  emailBlockRuleId = response.body.id;
});

test('Should return 400 when creating a Email Block Rule with malformed email', async ({ client, assert, user }) => {
  const response = await client
    .post(`${MODULE_URL}`)
    .loginVia(user, 'jwt')
    .send({
      email: EMAIL_RANDOM,
      to: true,
      from: true,
      notes: 'Unit testing',
    })
    .end();

  response.assertStatus(400);
  assert.containsAllKeys(response.body[0], ['message', 'field', 'validation']);
});

test('Should return 400 when creating a Email Block Rule with a repeated email', async ({ client, assert, user }) => {
  const response = await client
    .post(`${MODULE_URL}`)
    .loginVia(user, 'jwt')
    .send({
      email: EMAIL_RANDOM,
      to: true,
      from: true,
      notes: 'Unit testing',
    })
    .end();

  response.assertStatus(400);
  assert.containsAllKeys(response.body[0], ['message', 'field', 'validation']);
});

test('Should return 200 when listing all Email Block Rules', async ({ client, assert, user }) => {
  const response = await client
    .get(`${MODULE_URL}`)
    .loginVia(user, 'jwt')
    .send({
      page: 1,
      perPage: 10,
    })
    .end();

  response.assertStatus(200);
  assert.containsAllKeys(response.body.data[0], [...BASE_RESPONSE_FIELDS, 'user_name']);
});

test('Should return 200 when listing all Email Block Rules with filters & keywords', async ({
  client,
  assert,
  user,
}) => {
  const response = await client
    .get(`${MODULE_URL}`)
    .loginVia(user, 'jwt')
    .send({
      page: 1,
      perPage: 10,
      created_by: user.id,
      block_to: true,
      block_from: true,
      keyword: EMAIL_RANDOM,
    })
    .end();

  response.assertStatus(200);
  assert.containsAllKeys(response.body.data[0], [...BASE_RESPONSE_FIELDS, 'user_name']);
});

test('Should return 20- when deleting a Email Block Rule', async ({ client, user }) => {
  const response = await client.delete(`${MODULE_URL}/${emailBlockRuleId}`).loginVia(user, 'jwt').send().end();

  response.assertStatus(200);
});

after(async () => {
  if (emailBlockRuleId) await Database.table('email_tracking_block_lists').where('id', emailBlockRuleId).delete();
});
