'use strict';

const { test, trait, before, after } = use('Test/Suite')('Email Controller');

//Models
const SendgridEmailValidation = use('App/Models/SendgridEmailValidation');

//Utils
const url = 'api/v1';
const baseUrl = `${url}/email`;
const { ioc } = use('@adonisjs/fold');

trait('Test/ApiClient');
trait('Auth/Client');
trait('Test/Traits/User');

let testEmail;

const FakeSendgridEmailValidationResponse = {
  statusCode: 200,
  body: {
    result: {
      email: '1604335394360_test@outlook.com',
      verdict: 'Risky',
      score: 0.14986,
      local: '1604335394360_test',
      host: 'outlook.com',
      checks: {
        domain: { has_valid_address_syntax: true, has_mx_or_a_record: true, is_suspected_disposable_address: false },
        local_part: { is_suspected_role_address: false },
        additional: { has_known_bounces: false, has_suspected_bounces: true },
      },
      source: 'SIGNUP',
      ip_address: '127.0.0.1',
    },
  },
  headers: {
    server: 'nginx',
    date: 'Mon, 02 Nov 2020 16:43:19 GMT',
    'content-type': 'application/json',
    'content-length': '425',
    connection: 'close',
    'x-amzn-requestid': 'd285344a-e4d8-4765-85e4-9fa31e7869df',
    'x-amz-apigw-id': 'VY2OFGbsiYcF_lw=',
    'x-amzn-trace-id': 'Root=1-5fa03726-2064f6157819fc814ca3ff0b;Sampled=0',
    'access-control-allow-methods': 'HEAD, GET, PUT, POST, DELETE, OPTIONS, PATCH',
    'access-control-max-age': '21600',
    'access-control-expose-headers': 'Link, Location',
    'access-control-allow-origin': '*',
    'access-control-allow-headers':
      'AUTHORIZATION, Content-Type, On-behalf-of, x-sg-elas-acl, X-Recaptcha, X-Request-Source',
    'content-security-policy': "default-src https://api.sendgrid.com; frame-src 'none'; object-src 'none'",
    'x-content-type-options': 'nosniff',
    'strict-transport-security': 'max-age=31536000',
    'x-client-ff': '1000',
    'x-ratelimit-remaining': '599',
    'x-ratelimit-limit': '600',
    'x-ratelimit-reset': '1604335440',
    'powered-by': 'Mako',
  },
};

before(async () => {
  testEmail = `${Date.now()}_test@outlook.com`;
  FakeSendgridEmailValidationResponse.body.result.email = testEmail;
});

test('Should return 401 when not sending a token', async ({ assert, client }) => {
  assert.plan(1);
  const response = await client.post(`${baseUrl}/validate`).end();
  response.assertStatus(401);
});

//Fakes outside the scope of the class being called will not work
// Issue: https://github.com/adonisjs/fold/issues/13

// test('Should return 201 when creating/validating a email', async ({ client, user, assert }) => {
//   ioc.fake('Services/SendgridEmailValidation', () => {
//     return {
//       validateEmail() {
//         return FakeSendgridEmailValidationResponse;
//       },
//     };
//   });
//   const response = await client
//     .post(`${baseUrl}/validate`)
//     .loginVia(user, 'jwt')
//     .send({
//       email: testEmail,
//     })
//     .end();
//   response.assertStatus(201);
//   assert.hasAllKeys(response.body, ['success', 'code', 'data']);
//   assert.hasAllKeys(response.body.data, ['email', 'valid', 'score', 'suggestion', 'reason']);
//   ioc.restore('Services/SendgridEmailValidation');
// });

test('Should return 400 when creating/validating a email with not params send', async ({ client, user, assert }) => {
  ioc.fake('Services/SendgridEmailValidation', () => {
    return {
      validateEmail() {
        return FakeSendgridEmailValidationResponse;
      },
    };
  });
  const response = await client.post(`${baseUrl}/validate`).loginVia(user, 'jwt').send({}).end();
  response.assertStatus(400);
  ioc.restore('Services/SendgridEmailValidation');
});

after(async () => {
  await SendgridEmailValidation.query().where('email', testEmail).delete();
});
