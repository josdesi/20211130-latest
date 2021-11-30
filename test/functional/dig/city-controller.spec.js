const { test, trait, before } = use('Test/Suite')('City');
const State = use('App/Models/State');
const City = use('App/Models/City');
trait('Test/ApiClient');
trait('Auth/Client');
trait('Test/Traits/User');
let state;
let city;
before(async () => {
  state = await State.firstOrFail();
  city = await City.firstOrFail();
});


test('Should return status code 401 when listing cities and not sending auth token', async ({ client }) => {
  const response = await client
    .get('/api/v1/cities')
    .query({stateId: state.id})
    .end();
  response.assertStatus(401);
});

test('Should return status code 200 when listing cities', async ({ client, assert, user }) => {
  const response = await client
    .get('/api/v1/cities')
    .query({stateId: state.id, limit: 10})
    .loginVia(user, 'jwt')
    .end();
  response.assertStatus(200);

  if (response.body.length > 0) {
    assert.containsAllKeys(
      response.body[0],
      [
        'id',
        'state_id',
        'title',
        'is_state',
        'total_zips'
      ]);
  }
});

test('Should return status code 200 when listing zip codes by City', async ({ client, assert, user }) => {
  const response = await client
    .get(`/api/v1/cities/${city.id}/zips`)
    .query({cityId: city.id})
    .loginVia(user, 'jwt')
    .end();
  response.assertStatus(200);

  if (response.body.length > 0) {
    assert.containsAllKeys(
      response.body[0],
      [
        'id',
        'title'
      ]);
  }
});

test('Should return status code 404 when listing zip codes by City and sending non-existent city id.', async ({ client, assert, user }) => {
  const response = await client
    .get(`/api/-1/cities/${city.id}/zips`)
    .query({cityId: city.id})
    .loginVia(user, 'jwt')
    .end();
  response.assertStatus(404);
});


test('Should return status code 200 when searching City by title', async ({ client, assert, user }) => {
  const response = await client
    .get(`/api/v1/cities/search`)
    .query({keyword: 'alaba', limit: 10})
    .loginVia(user, 'jwt')
    .end();
  response.assertStatus(200);

  if (response.body.length > 0) {
    assert.containsAllKeys(
      response.body[0],
      [
        'id',
        'title',
        'state',
        'slug',
        'is_state'
      ]);
  }
});
