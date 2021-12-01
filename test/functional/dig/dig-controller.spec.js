const { test, trait, after, before} = use('Test/Suite')('Dig Controller');

const { userStatus, userRoles } = use('App/Helpers/Globals');

const RecruiterHasIndustry = use('App/Models/RecruiterHasIndustry');
const Specialty = use('App/Models/Specialty');
const Subspecialty = use('App/Models/Subspecialty');
const State = use('App/Models/State');
trait('Test/ApiClient');
trait('Auth/Client');
trait('Test/Traits/User');
trait('DatabaseTransactions')


test('Should return 200 status code when searching for recruiters with searchModelA', async ({client, assert, user}) => {
  const response = await client
  .get('/api/v1/digs')
  .query({searchModel: 'A', keyword: 'Sandy'})
  .loginVia(user, 'jwt')
  .end();

  response.assertStatus(200);

  response.assertJSONSubset({
    list: [],
    map: []
  });

  if (response.body.list.length > 0) {
    assert.hasAllKeys(
      response.body.list[0],
      [
        'id',              'first_name',
        'last_name',       'full_name',
        'industry_title',  'state_id',
        'state_slug',      'state_title',
        'latitude',        'longitude',
        'email',           'phone',
        'initials',        'ext',             
        'coach',           'specialty_title', 
        'subspecialty_title', 'industry_id',     
        'specialty_id',    'subspecialty_id', 
        'color',           'states'
      ]
    );
  }

  if (response.body.map.length > 0) {
    assert.hasAllKeys(
      response.body.map[0],
      [
        'latitude',
        'longitude',
        'state',
        'values'
      ]
    );
  }
});


test('Should return 200 status code when searching for recruiters with searchModelB', async ({client, assert, user}) => {
  const response = await client
  .get('/api/v1/digs')
  .query({searchModel: 'B', keyword: 'Sandy'})
  .loginVia(user, 'jwt')
  .end();

  response.assertStatus(200);

  response.assertJSONSubset({
    list: [],
    map: []
  });
  if (response.body.list.length > 0) {
    assert.hasAllKeys(
      response.body.list[0],
      [
        'id',              'first_name',
        'last_name',       'full_name',
        'industry_title',  'state_id',
        'state_slug',      'state_title',
        'latitude',        'longitude',
        'email',           'phone',
        'initials',        'ext',             
        'coach',           'specialty_title', 
        'subspecialty_title', 'industry_id',     
        'specialty_id',    'subspecialty_id', 
        'color',           'states'
      ]
    );
  }

  if (response.body.map.length > 0) {
    assert.hasAllKeys(
      response.body.map[0],
      [
        'latitude',
        'longitude',
        'state',
        'values'
      ]
    );
  }
});

test('Should return 401 status code when trying to search with non authorized request', async ({client}) => {
  const response = await client
  .get('/api/v1/digs')
  .query({searchModel: 'A', name: 'Sandy'})
  .end();

  response.assertStatus(401);
});


test('Should return 201 status when saving user industry data', async ({client, user}) => {
  const userPi = await user.personalInformation().fetch();
  const payload = {
     user: {
       first_name: userPi.first_name,
       last_name: userPi.last_name,
       email: user.email,
       start_date: '2020-02-14T06:00:00.000Z',
       status: userStatus.Active,
       manager_id: user.id,
       roles : [ userRoles.Recruiter ],
       thereAreChanges: false,
       id: user.id
     },
     dig: {
       data: [],
       mode:'nothing'
     }
  };
  const response = await client
    .post('/api/v1/digs')
    .send(payload)
    .loginVia(user, 'jwt')
    .end();
  await RecruiterHasIndustry
    .query()
    .where('recruiter_id', user.id)
    .delete()
  response.assertStatus(201);
});


test('Should return 400 status when saving user industry and sends wrong data', async ({client, user}) => {
  const payload = {};
  const response = await client
    .post('/api/v1/digs')
    .send(payload)
    .loginVia(user, 'jwt')
    .end();
  response.assertStatus(400);
});