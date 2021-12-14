'use strict';
//Test
const { test, trait, after, before } = use('Test/Suite')('Placements NetSuite Integration');
const Event = use('Event');

//Models
const ClientAppRegistration = use('App/Models/ClientAppRegistration');

//Utils
const crypto = require('crypto');
const Env = use('Env');
const key = Env.get('APP_KEY');
const url = 'api/v1';
const clientNameTest = 'Client Test';
const clientIdTest = 'd9acf164-57ac-4e0b-aa1e-1a7eae759345';
const clientSecret = 'f3f38965-7c74-49f5-8254-372fb0ba311f';
let clienAppResgistration, clientSecretHashTest;

//Traits
trait('Test/ApiClient');
trait('Auth/Client');

before(async () => {
  Event.fake();
});

const generateClientAppTestRecord = async (clientNameTest, clientIdTest, clientSecretTest) => {
  clienAppResgistration = await ClientAppRegistration.findOrCreate({
    client_id: clientIdTest,
    client_secret_app: clientSecretTest,
    client_app_name: clientNameTest,
    available: 1,
  });
};

const getSecretHash = (key, clientSecret) => {
  return crypto.createHmac('sha256', key).update(clientSecret).digest('hex').toString();
};

const setupCredentials = async () => {
  clientSecretHashTest = getSecretHash(key, clientSecret);
  await generateClientAppTestRecord(clientNameTest, clientIdTest, clientSecretHashTest);
};

test('Should return 401 when not sending credentials', async ({ assert, client }) => {
  assert.plan(1);
  const response = await client.get(`${url}/placements/forEstimate`).end();
  response.assertStatus(401);
});

test('Should return 200 when retrieving the placements to process', async ({ client, user, assert }) => {
  await setupCredentials();
  const response = await client
    .get(`${url}/placements/for-processing`)
    .header('clientId', clientIdTest)
    .header('clientSecret', clientSecret)
    .end();

  response.assertStatus(200);

  if (response.body && response.body.length > 0) {
    const object = response.body[0];
    assert.containsAllKeys(object, [
      'id',
      'approvedDate',
      'notes',
      'additionalInvoiceRecipients',
      'feeAgreement',
      'hiringAuthority',
      'company',
      'recruiter',
      'status',
      'splits',
    ]);
  }
});

after(async () => {
  clienAppResgistration && (await clienAppResgistration.delete());
});
