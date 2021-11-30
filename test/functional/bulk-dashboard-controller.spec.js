const { test, trait, after, before } = use('Test/Suite')('Bulk Dashboard Controller');

trait('Test/ApiClient');
trait('Auth/Client');
trait('Test/Traits/User');
trait('DatabaseTransactions');

//Utils
const moment = use('moment');
const url = 'api/v1';
const baseUrl = `${url}/bulk-email-dashboard`;
const { DateFormats } = use('App/Helpers/Globals');
const endDate = moment().format(DateFormats.SystemDefault);
const startDate = moment(endDate).subtract('1', 'month').format(DateFormats.SystemDefault);

let tableBulkSentExpectedColumns;

test('Should return status and 401 when not sending auth token.', async ({ client }) => {
  const response = await client.get('api/v1/search').end();
  response.assertStatus(401);
});

test('Should return 200 when requesting the total bulk stats', async ({ client, assert, user }) => {
  const response = await client
    .get(`${baseUrl}/total-bulk-stats`)
    .header('Timezone', '-5')
    .query({ startDate, endDate })
    .loginVia(user, 'jwt')
    .end();

  response.assertStatus(200);
  assert.hasAllKeys(response.body[0], ['title', 'total', 'icon', 'format']);
});

test('Should return 200 when requesting the total bulk sent', async ({ client, assert, user }) => {
  const response = await client
    .get(`${baseUrl}/total-bulk-sent`)
    .header('Timezone', '-5')
    .query({ startDate, endDate })
    .loginVia(user, 'jwt')
    .end();

  response.assertStatus(200);
  assert.hasAllKeys(response.body[0], ['title', 'total', 'icon']);
});

test('Should return 200 when requesting the trend bulk sent', async ({ client, assert, user }) => {
  const response = await client
    .get(`${baseUrl}/trend-bulk-sent`)
    .header('Timezone', '-5')
    .query({ startDate, endDate })
    .loginVia(user, 'jwt')
    .end();

  response.assertStatus(200);
  assert.hasAllKeys(response.body, ['series', 'colors', 'granularity', 'data']);
});

test('Should return 200 when requesting the table bulk sent', async ({ client, assert, user }) => {
  const response = await client
    .get(`${baseUrl}/table-bulk-sent`)
    .header('Timezone', '-5')
    .query({ startDate, endDate })
    .loginVia(user, 'jwt')
    .end();

  response.assertStatus(200);
  assert.hasAllKeys(response.body, ['columns', 'rows']);
  tableBulkSentExpectedColumns = response.body.columns.length;
});

test('Should return 200 when requesting the table bulk sent as csv', async ({ client, assert, user }) => {
  const response = await client
    .get(`${baseUrl}/table-bulk-sent`)
    .header('Timezone', '-5')
    .query({ startDate, endDate, format: 'csv' })
    .loginVia(user, 'jwt')
    .end();

  response.assertStatus(200);
  assert.notTypeOf(response.body, 'object', 'A json response is not valid when requesting CSV format');
});

test('Should return 200 when requesting the table bulk sent using withoutBulks as true', async ({
  client,
  assert,
  user,
}) => {
  const response = await client
    .get(`${baseUrl}/table-bulk-sent`)
    .header('Timezone', '-5')
    .query({ startDate, endDate, withoutBulks: true })
    .loginVia(user, 'jwt')
    .end();

  response.assertStatus(200);
  assert.hasAllKeys(response.body, ['columns', 'rows']);
  if (response.body.columns.length >= tableBulkSentExpectedColumns) {
    throw new Error(
      'The `withoutBulks` param is not affecting the endpoint, check why it is returning the same number of results as the normal endpoint'
    );
  }
});

test('Should return 200 when requesting the table bulk sent using allRecruiters as true', async ({
  client,
  assert,
  user,
}) => {
  const response = await client
    .get(`${baseUrl}/table-bulk-sent`)
    .header('Timezone', '-5')
    .query({ startDate, endDate, allRecruiters: true })
    .loginVia(user, 'jwt')
    .end();

  response.assertStatus(200);
  assert.hasAllKeys(response.body, ['columns', 'rows']);
});
