const { test, trait, after, before } = use('Test/Suite')('Search Controller');

trait('Test/ApiClient');
trait('Auth/Client');
trait('Test/Traits/User');
trait('DatabaseTransactions');

test('Should return status and 401 when not sending auth token.', async ({ client }) => {
  const response = await client.get('api/v1/search').end();

  response.assertStatus(401);
});

test('Should return status and 200 when searching for candidates.', async ({ client, assert, user }) => {
  const response = await client
    .get('api/v1/search')
    .query({ entityType: 'candidate', keyword: 'Cristo' })
    .loginVia(user, 'jwt')
    .end();

  response.assertStatus(200);
  if (response.body.length > 0) {
    assert.hasAllKeys(response.body[0], [
      'id',
      'title',
      'subtitle',
      'recruiter',
      'initials',
      'type',
      'email',
      'state',
      'city',
      'current_company',
    ]);
  }
});

test('Should return status and 200 when searching for joborder.', async ({ client, assert, user }) => {
  const response = await client
    .get('api/v1/search')
    .query({ entityType: 'joborder', keyword: 'Account' })
    .loginVia(user, 'jwt')
    .end();
  response.assertStatus(200);
  if (response.body.length > 0) {
    assert.hasAllKeys(response.body[0], ['id', 'title', 'subtitle', 'recruiter', 'initials', 'type', 'state', 'city']);
  }
});

test('Should return status and 200 when searching for company.', async ({ client, assert, user }) => {
  const response = await client
    .get('api/v1/search')
    .query({ entityType: 'company', keyword: 'Ninte' })
    .loginVia(user, 'jwt')
    .end();
  response.assertStatus(200);
  if (response.body.length > 0) {
    assert.hasAllKeys(response.body[0], ['id', 'name', 'subtitle', 'recruiter', 'initials', 'type']);
  }
});

test('Should return status and 200 when searching for hiring authority.', async ({ client, assert, user }) => {
  const response = await client
    .get('api/v1/search')
    .query({ entityType: 'hiringAuthority', keyword: 'Ninte' })
    .loginVia(user, 'jwt')
    .end();
  response.assertStatus(200);
  if (response.body.length > 0) {
    assert.containsAllKeys(response.body[0], [
      'id',
      'title',
      'subtitle',
      'recruiter',
      'initials',
      'type',
      'specialty',
      'subspecialty',
      'full_name',
      'first_name',
      'last_name',
      'work_email',
    ]);
  }
});

test('Should return status and 200 when searching for name.', async ({ client, assert, user }) => {
  const response = await client
    .get('api/v1/search')
    .query({ entityType: 'name', keyword: 'Ninte' })
    .loginVia(user, 'jwt')
    .end();
  response.assertStatus(200);

  if (response.body.length > 0) {
    assert.hasAllKeys(response.body[0], ['id', 'title', 'subtitle', 'recruiter', 'initials', 'type', 'email']);
  }
});
