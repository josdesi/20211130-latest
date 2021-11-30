const { test, trait } = use('Test/Suite')('  USER STORY 3626 - Dummy test');

const url = 'api/v1';
const baseUrl = `${url}`;
const path = `sendouts/summary`;

trait('Test/ApiClient');
trait('Auth/Client');
trait('Test/Traits/User');

test('Should return status code 200', async ({ client, user }) => {
  const filter =
    '?direction=desc&end_date=2021-11-18 23:59:59&keyword=&orderBy=tracking_date&page=1&perPage=20&recruiterIds=680&start_date=2021-01-01 00:00:00&userFilter=3';
  const url = `${baseUrl}/${path}/${filter}`;
  const response = await client.get(url).loginVia(user, 'jwt').end();

  response.assertStatus(200);
});