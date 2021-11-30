'use strict';

const { before, beforeEach, test, trait, after } = use('Test/Suite')('Industry');
const User = use('App/Models/User');
const Industry = use('App/Models/Industry');

trait('Test/ApiClient');
trait('Auth/Client');
trait('DatabaseTransactions');
trait('Test/Traits/User');
let user;
let timestamp;
let title;
let email;
let industry;


before(async () => {
  timestamp = new Date().getTime();
  title = `Industry title ${timestamp}`;
  email = `test.induststry${timestamp}@gogpac.com`
});

test('Should return 200 when getting all the Industries', async ({ client, assert, user }) => {
  const response = await client.get('/api/v1/industries').loginVia(user, 'jwt').end();
  response.assertStatus(200);
  response.body.forEach((item) => {
    assert.hasAllKeys(item, ['id', 'title', 'created_at', 'created_by', 'updated_at', 'updated_by', 'specialties', 'email']);
  });
});

test('Should return 201 when creating an Industry', async ({ client, user }) => {
  const body = {
    title,
    email
  };
  const response = await client.post('/api/v1/industries').send(body).loginVia(user, 'jwt').end();
  industry = response.body;
  response.assertStatus(201);
});

test('Should return 404 when geeting a non existing Industry', async ({ client, user }) => {
  const response = await client.get(`/api/v1/industries/0`).loginVia(user, 'jwt').end();

  response.assertStatus(404);
});

test('Should return 200 when getting a single Industry by Id', async ({ client, assert, user }) => {
  const response = await client.get(`/api/v1/industries/${industry.id}`).loginVia(user, 'jwt').end();

  response.assertStatus(200);
  assert.hasAllKeys(response.body, ['id', 'title', 'created_at', 'created_by', 'updated_at', 'updated_by', 'email']);
});

test('Should return 201 when updating an Industry', async ({ client, assert, user }) => {
  title = `${title}-${timestamp}`;
  const response = await client
    .put(`/api/v1/industries/${industry.id}`)
    .send({
      title,
      email
    })
    .loginVia(user, 'jwt')
    .end();
  response.assertStatus(201);
  assert.hasAllKeys(response.body, ['id', 'title', 'created_at', 'updated_at', 'created_by', 'updated_by', 'email', 'specialties']);
});

after(async () => {
  if(industry){
    await Industry.query().where('id',industry.id).delete();
  }
});