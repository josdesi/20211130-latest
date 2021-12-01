const { test, trait, after } = use('Test/Suite')('State');

trait('Test/ApiClient');
trait('Auth/Client');
trait('Test/Traits/User');


test('Should return status code 200 when listing states', async ({ client, assert, user }) => {
  const response = await client
    .get('/api/v1/states')
    .loginVia(user, 'jwt')
    .end();
  response.assertStatus(200);

  if (response.body.length > 0) {
    assert.hasAllKeys(
      response.body[0],
      [
        'id',
        'title',
        'state_slug',
        'country_title',
        'country_id',
        'country_slug',
        'total_cities',
        'compound_title'
      ]);
  }
});