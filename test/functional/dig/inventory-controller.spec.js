const { test, trait, after, before } = use('Test/Suite')('Inventory Controller');

trait('Test/ApiClient');
trait('Auth/Client');
trait('Test/Traits/User');
trait('DatabaseTransactions');


test('Should return status and 401 when not sending auth token.', async ({ client }) => {
  const response = await client.get('api/v1/inventories').end();

  response.assertStatus(401);
});

test('Should return status and 400 when sending invalid Entity.', async ({ client, user }) => {
  const response = await client
    .get('api/v1/inventories')
    .query({ entityType: 'TheRealSlimShady' })
    .loginVia(user, 'jwt')
    .end();

  response.assertStatus(400);
});


test('Should return status and 200 when searching for candidates.', async ({ client, assert, user }) => {
  const response = await client
    .get('api/v1/inventories')
    .query({ entityType: 'candidate', keyword: 'Cristo' })
    .loginVia(user, 'jwt')
    .end();

  response.assertStatus(200);
  if (response.body.length > 0) {
    assert.hasAllKeys(
      response.body[0],
      [
        'id',
        'title',
        'full_name',
        'created_at',
        'updated_at',
        'latitude',
        'longitude',
        'recruiter',
        'initials',
        'recruiter_email',
        'specialty',
        'subspecialty',
        'type',
        'type_class',
        'functional_title',
        'industry',
        'status',
        'type_detail'
      ]);
  }
});

test('Should return status and 200 when searching for joborder.', async ({ client, assert, user }) => {
  const response = await client
    .get('api/v1/inventories')
    .query({ entityType: 'joborder', keyword: 'Account' })
    .loginVia(user, 'jwt')
    .end();

  response.assertStatus(200);
  if (response.body.length > 0) {
    assert.hasAllKeys(
      response.body[0],
      [
        'id',
        'title',
        'industry',
        'created_at',
        'updated_at',
        'latitude',
        'longitude',
        'recruiter',
        'initials',
        'recruiter_email',
        'specialty',
        'subspecialty',
        'type',
        'type_class',
        'functional_title',
        'company_name',
        'status',
        'type_detail'
      ]);
  }
});


test('Should return status and 200 when searching for company.', async ({ client, assert, user }) => {
  const response = await client
    .get('api/v1/inventories')
    .query({ entityType: 'company', keyword: 'Ninte' })
    .loginVia(user, 'jwt')
    .end();

  response.assertStatus(200);
  if (response.body.length > 0) {
    assert.hasAllKeys(
      response.body[0],
      [
        'id',
        'name',
        'industry',
        'latitude',
        'longitude',
        'recruiter',
        'initials',
        'recruiter_email',
        'specialty',
        'subspecialty',
        'type',
        'type_class',
        'type_detail'
      ]);
  }
});



