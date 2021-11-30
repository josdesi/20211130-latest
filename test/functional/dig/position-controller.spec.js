const { test, trait, after, before } = use('Test/Suite')('Position Controller');
const Industry = use('App/Models/Industry');
const Position = use('App/Models/Position');
trait('Test/ApiClient');
trait('Auth/Client');
trait('Test/Traits/User');
trait('DatabaseTransactions');
let industry;
let position;
before(async () => {
  industry = await Industry.firstOrFail();
  position = await Position.firstOrFail();
});

test('Should return status 200 and correct format when getting positions', async ({ client, user, assert }) => {
  const response = await client.get('/api/v1/positions').loginVia(user, 'jwt').end();

  response.assertStatus(200);
  response.body.forEach((item) => {
    assert.hasAllKeys(item, [
      'id',
      'industry_id',
      'title',
      'created_at',
      'created_by',
      'updated_at',
      'updated_by',
      'specialty_id'
    ]);
  });
});

test('Should return status and 401 when not sending auth token.', async ({ client, assert }) => {
  const response = await client.get('/api/v1/positions').end();

  response.assertStatus(401);
});

test('Should return 201 statuscode when creating valid Position', async ({ client, user, assert }) => {
  const body = {
    industry_id: industry.id,
    title: 'Some title',
  };
  const response = await client.post('/api/v1/positions').send(body).loginVia(user, 'jwt').end();
  response.assertStatus(201);
  response.assertJSONSubset({
    message: 'Position created successfully',
  });
});

test('Should return 400 statuscode when trying to create a Position with wrong data', async ({
  client,
  user,
  assert,
}) => {
  const body = {
    title: null,
    industry_id: 0,
  };
  const response = await client.post('/api/v1/positions').send(body).loginVia(user, 'jwt').end();
  response.assertStatus(400);
});

test('Should return 400 status code when trying to update Position with non valid data.', async ({
  client,
  user,
  assert,
}) => {
  const body = {
    title: null,
    industry_id: 0,
  };
  const response = await client
    .put('/api/v1/positions/' + position.id)
    .send(body)
    .loginVia(user, 'jwt')
    .end();
  response.assertStatus(400);
});

test('Should return 200 statuscode when updating Position correctly', async ({ client, user, assert }) => {
  const body = {
    title: 'Some updated title',
    industry_id: industry.id,
  };
  const response = await client
    .put('/api/v1/positions/' + position.id)
    .send(body)
    .loginVia(user, 'jwt')
    .end();
  response.assertStatus(200);
  assert.hasAllKeys(response.body, [
    'id',
    'industry_id',
    'title',
    'created_at',
    'created_by',
    'updated_at',
    'updated_by',
    'specialty_id'
  ]);
});

test('Should return 404 when looking for inexistent Position', async ({ client, user, assert }) => {
  const response = await client.get('/api/v1/positions/0').loginVia(user, 'jwt').end();
  response.assertStatus(404);
});

test('Should return 200 when getting a valid position', async ({ client, user, assert }) => {
  const response = await client
    .get('/api/v1/positions/' + position.id)
    .loginVia(user, 'jwt')
    .end();
  assert.hasAllKeys(response.body, [
    'id',
    'industry_id',
    'title',
    'created_at',
    'created_by',
    'updated_at',
    'updated_by',
    'specialty_id'
  ]);
});
