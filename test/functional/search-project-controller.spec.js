'use strict';

const { test, trait, before, after } = use('Test/Suite')('Search project');

//Models
const SearchProject = use('App/Models/SearchProject');
const Specialty = use('App/Models/Specialty');
const Subspecialty = use('App/Models/Subspecialty');
const Candidate = use('App/Models/Candidate');
const JobOrder = use('App/Models/JobOrder');
const Name = use('App/Models/Name');

//Utils
const JobOrderRepository = new (use('App/Helpers/JobOrderRepository'))();
const { SearchProjectTypes } = use('App/Helpers/Globals');
const Helpers = use('Helpers');
const url = 'api/v1';
const baseUrl = `${url}/search-projects`;

trait('Test/ApiClient');
trait('Auth/Client');
trait('Test/Traits/User');

let searchProjectCandidate;
let searchProjectCandidateCopy;
let searchProjectHiringAuthority;
let specialty;
let subSpecialty;
let candidate;
let putCandidate;
let jobOrder;
let putJobOrder;
let hiringAuthorities;
let putHiringAuthorities;
let name;
let putName;

before(async () => {
  specialty = await Specialty.firstOrFail();
  subSpecialty = await Subspecialty.firstOrFail();
  candidate = await Candidate.query()
    .with('personalInformation')
    .with('personalInformation.address')
    .whereNot('id', 0)
    .first(); //firsrOrFailt return candidate 0, alpha?
  putCandidate = await Candidate.query().whereNot('id', 0).whereNot('id', candidate.id).first(); //firsrOrFailt return candidate 0, alpha?
  jobOrder = await JobOrder.query().whereHas('hiringAuthorities', null, '>', 1).first();
  putJobOrder = await JobOrder.query().whereNot('id', jobOrder.id).whereHas('hiringAuthorities', null, '>', 1).first();
  hiringAuthorities = (await JobOrderRepository.getAvailableHiringAuthoritiesByArray([jobOrder.id])).data;
  putHiringAuthorities = (await JobOrderRepository.getAvailableHiringAuthoritiesByArray([putJobOrder.id])).data;

  name = await Name.firstOrFail();
  putName = await Name.query().whereNot('id', name.id).first();
});

test('Should return 401 when not sending a token', async ({ assert, client }) => {
  assert.plan(1);
  const response = await client.post(`${baseUrl}`).end();
  response.assertStatus(401);
});

test('Should return 201 when creating a SearchProject (candidate)', async ({ client, user }) => {
  const response = await client
    .post(`${baseUrl}`)
    .loginVia(user, 'jwt')
    .send({
      name: 'Search project candidates test',
      is_private: false,
      candidates: [candidate.id],
    })
    .end();
  response.assertStatus(201);
  response.assertJSONSubset({
    name: 'Search project candidates test',
    is_private: false,
    searchProjectCandidates: [
      {
        candidate_id: candidate.id,
        created_by: user.id,
      },
    ],
    created_by: user.id,
  });

  searchProjectCandidate = await SearchProject.find(response.body.id);
});

test('Should return 200 when a SearchProject items (candidate) are requested', async ({ client, user, assert }) => {
  const candidateInfo = candidate.toJSON();
  const filter = `?keyword=&state_id=&city_id=${candidateInfo.personalInformation.address.city_id}&page=1&perPage=10&orderBy=created_at&direction=desc`;
  const response = await client
    .get(`${baseUrl}/${searchProjectCandidate.id}/inventory${filter}`)
    .loginVia(user, 'jwt')
    .end();
  response.assertStatus(200);
  response.assertJSONSubset({
    total: 1,
    perPage: 10,
    page: 1,
    lastPage: 1,
    data: [
      {
        id: candidateInfo.id,
        email: candidateInfo.email,
        full_name: candidateInfo.personalInformation.full_name,
        specialty_id: candidateInfo.specialty_id,
        subspecialty_id: candidateInfo.subspecialty_id,
        city_id: candidateInfo.personalInformation.address.city_id,
      },
    ],
  });
  // assert.hasAllKeys(response.body, ['total', 'perPage', 'page', 'lastPage', 'data']);
});

test('Should return 200 when a SearchProject items (with keyword) are requested', async ({ client, user }) => {
  const filter =
    '?keyword=this_failed_last_time&state_id=&city_id=&page=1&perPage=10&orderBy=created_at&direction=desc';
  const response = await client
    .get(`${baseUrl}/${searchProjectCandidate.id}/inventory${filter}`)
    .loginVia(user, 'jwt')
    .end();
  response.assertStatus(200);
});

test('Should return 201 when creating a SearchProject from another SearchProject', async ({ client, user }) => {
  const response = await client
    .post(`${baseUrl}`)
    .loginVia(user, 'jwt')
    .send({
      name: 'Search project candidates test copy',
      is_private: false,
      search_project_id: searchProjectCandidate.id,
      search_params: {
        query: {
          direction: 'asc',
          keyword: '',
          orderBy: 'full_name',
          page: 1,
          perPage: 10000,
          userFilter: 0,
        },
        exclude: [],
      },
    })
    .end();
  response.assertStatus(201);
  response.assertJSONSubset({ //Must be an exact copy of searchProjectCandidate 
    name: 'Search project candidates test copy',
    is_private: false,
    searchProjectCandidates: [
      {
        candidate_id: candidate.id,
        created_by: user.id,
      },
    ],
    created_by: user.id,
  });

  searchProjectCandidateCopy = await SearchProject.find(response.body.id);
});

test('Should return 200 when a SearchProject quick info is requested', async ({ client, user, assert }) => {
  const response = await client.get(`${baseUrl}/${searchProjectCandidate.id}/quick-info`).loginVia(user, 'jwt').end();
  response.assertStatus(200);
  assert.hasAllKeys(response.body, ['id', 'name', 'total_items', 'is_mine']);
});

test('Should return 201 when creating a SearchProject (HiringAuthority & Names)', async ({ client, user }) => {
  const response = await client
    .post(`${baseUrl}`)
    .loginVia(user, 'jwt')
    .send({
      name: 'Search project hiring authorities & names test',
      is_private: true,
      job_orders: [jobOrder.id],
      names: [name.id],
    })
    .end();
  response.assertStatus(201);
  const haInventory = hiringAuthorities.map((id) => {
    return {
      hiring_authority_id: id,
      created_by: user.id,
    };
  });
  response.assertJSONSubset({
    name: 'Search project hiring authorities & names test',
    is_private: true,
    created_by: user.id,
    searchProjectHiringAuthories: haInventory,
    searchProjectNames: [
      {
        name_id: name.id,
        created_by: user.id,
      },
    ],
  });

  searchProjectHiringAuthority = await SearchProject.find(response.body.id);
});

test('Should return 200 when a SearchProject items (HiringAuthority) are requested', async ({
  client,
  user,
  assert,
}) => {
  const filter = `?keyword=&state_id=&city_id=&specialty_id=&subspecialty_id=&page=1&perPage=10&orderBy=created_at&direction=desc`;
  const response = await client
    .get(`${baseUrl}/${searchProjectHiringAuthority.id}/inventory${filter}`)
    .loginVia(user, 'jwt')
    .end();
  response.assertStatus(200);
  assert.hasAllKeys(response.body, ['total', 'perPage', 'page', 'lastPage', 'data']);
  assert.hasAllKeys(response.body.data[0], [
    'item_search_project_type',
    'item_search_project_title',
    'status',
    'status_id',
    'phone',
    'mobile',
    'id',
    'email',
    'full_name',
    'location',
    'state',
    'city',
    'specialty',
    'subspecialty',
    'created_at',
    'specialty_id',
    'subspecialty_id',
    'city_id',
    'state_id',
    'is_name',
    'company_type',
    'company_type_color',
    'company_type_id',
    'current_company',
    'position_id',
    'position_title',
    'communication_actions',
    'last_activity_date',
    'last_activity_recruiter',
    'last_activity_title',
    'searchable_text',
  ]);
});

test('Should return 200 when SearchProjects are requested', async ({ client, user, assert }) => {
  const filter = `?keyword=test&recruiter_id=${user.id}&only_mine=false&search_project_type_id=&page=1&perPage=10&orderBy=created_at&direction=desc`;
  const response = await client.get(`${baseUrl}${filter}`).loginVia(user, 'jwt').end();
  response.assertStatus(200);
  assert.hasAllKeys(response.body, ['total', 'perPage', 'page', 'lastPage', 'data']);
  assert.hasAllKeys(response.body.data[0], [
    'id',
    'name',
    'is_private',
    'created_by',
    'created_by_full_name',
    'total_candidates',
    'total_hiring_authorities',
    'total_undefined_names',
    'total_items',
    'created_at',
    'updated_at',
  ]);
});

test('Should return 200 when a search project is requested', async ({ client, user, assert }) => {
  const filter = `?ids=${jobOrder.id},${putJobOrder.id}`;
  const response = await client
    .put(`${baseUrl}/${searchProjectCandidate.id}/preview`)
    .loginVia(user, 'jwt')
    .send({
      candidates: [candidate.id, putCandidate.id],
      hiring_authorities: [],
      names: [name.id, putName.id],
      job_orders: [jobOrder.id, putJobOrder.id],
      candidate_query: {
        query: {
          page: 1,
          perPage: 999999, //Front end returns the pagination limit that the query listin returned beforehand
          keyword: 'j',
        },
        exclude: [],
      },
      joborder_query: {
        query: {
          page: 1,
          perPage: 999999,
          stateId: 2,
        },
        exclude: [],
      },
      name_query: {
        query: {
          page: 1,
          perPage: 999999,
          positionId: '1',
        },
        exclude: [],
      },
    })
    .end();
  response.assertStatus(200);
  assert.hasAllKeys(response.body, [
    'hiringAuthoritiesResult',
    'candidatesResult',
    'namesResult',
    'newIdsCount',
    'repeatedIdsCount',
  ]);
  assert.hasAllKeys(response.body.hiringAuthoritiesResult, ['newIds', 'repeatedIds']);
  assert.hasAllKeys(response.body.candidatesResult, ['newIds', 'repeatedIds']);
  assert.hasAllKeys(response.body.namesResult, ['newIds', 'repeatedIds']);
});

test('Should return 200 when a SearchProjects types are requested', async ({ client, user, assert }) => {
  const response = await client.get(`${baseUrl}/types`).loginVia(user, 'jwt').end();
  response.assertStatus(200);
  assert.hasAllKeys(response.body[0], ['id', 'title', 'updated_at', 'created_at']);
  response.assertJSONSubset([
    {
      id: SearchProjectTypes.Candidate,
      title: 'Candidate',
    },
    {
      id: SearchProjectTypes.HiringAuthority,
      title: 'Hiring Authority',
    },
  ]);
});

test('Should return 200 when updating (adding) an item to the SearchProject (Candidate & Names)', async ({
  client,
  user,
}) => {
  const response = await client
    .put(`${baseUrl}/${searchProjectCandidate.id}/inventory`)
    .loginVia(user, 'jwt')
    .send({
      candidates: [putCandidate.id],
      names: [putName.id],
    })
    .end();
  response.assertStatus(200);
  response.assertJSONSubset({
    name: 'Search project candidates test',
    is_private: false,
    created_by: user.id,
    searchProjectCandidates: [
      {
        candidate_id: candidate.id,
        created_by: user.id,
      },
      {
        candidate_id: putCandidate.id,
        created_by: user.id,
      },
    ],
    searchProjectNames: [
      {
        name_id: putName.id,
        created_by: user.id,
      },
    ],
  });
});

test('Should return 200 when updating (adding) an item to the SearchProject (HiringAuthority)', async ({
  client,
  user,
}) => {
  const response = await client
    .put(`${baseUrl}/${searchProjectHiringAuthority.id}/inventory`)
    .loginVia(user, 'jwt')
    .send({
      job_orders: [putJobOrder.id],
    })
    .end();
  response.assertStatus(200);
  const inventory = [
    ...hiringAuthorities.map((id) => {
      return {
        hiring_authority_id: id,
        created_by: user.id,
      };
    }),
    ...putHiringAuthorities.map((id) => {
      return {
        hiring_authority_id: id,
        created_by: user.id,
      };
    }),
  ];

  response.assertJSONSubset({
    name: 'Search project hiring authorities & names test',
    is_private: true,
    created_by: user.id,
    searchProjectHiringAuthories: inventory,
    searchProjectNames: [
      {
        name_id: name.id,
        created_by: user.id,
      },
    ],
  });
});

test('Should return 200 when removing an item from the SP by search params but the result should be empty, due to the exclude', async ({
  client,
  user,
  assert,
}) => {
  const response = await client
    .delete(`${baseUrl}/${searchProjectCandidate.id}/inventory`)
    .loginVia(user, 'jwt')
    .send({
      search_params: {
        query: {
          direction: 'asc',
          itemSearchProjectTypes: 1,
          keyword: '',
          orderBy: 'full_name',
          page: 1,
          perPage: 10,
          userFilter: 0,
        },
        exclude: [
          {
            id: putCandidate.id,
            item_search_project_type: 1,
          },
          {
            id: candidate.id,
            item_search_project_type: 1,
          },
        ],
      },
    })
    .end();
  response.assertStatus(200);
  assert.equal(response.body.searchProjectCandidates, 0, 'No candidate should have been deleted');
  assert.equal(response.body.searchProjectHiringAuthories, 0, 'No hiring authority should have been deleted');
  assert.equal(response.body.searchProjectNames, 0, 'No name should have been deleted');
});

test('Should return 200 when removing an item from the SP by search params but only two candidate should have been deleted', async ({
  client,
  user,
  assert,
}) => {
  const response = await client
    .delete(`${baseUrl}/${searchProjectCandidate.id}/inventory`)
    .loginVia(user, 'jwt')
    .send({
      search_params: {
        query: {
          direction: 'asc',
          itemSearchProjectTypes: 1,
          keyword: '',
          orderBy: 'full_name',
          page: 1,
          perPage: 10,
          userFilter: 0,
        },
        exclude: [],
      },
    })
    .end();
  response.assertStatus(200);
  assert.isAbove(response.body.searchProjectCandidates, 0, 'There should have been removed candidates');
  assert.equal(response.body.searchProjectHiringAuthories, 0, 'No hiring authority should have been deleted');
  assert.equal(response.body.searchProjectNames, 0, 'No name should have been deleted');
});

test('Should return 200 when deleting (removing) an item from the SearchProject (HiringAuthority)', async ({
  client,
  user,
}) => {
  const inventory = hiringAuthorities.map((id) => id);

  const response = await client
    .delete(`${baseUrl}/${searchProjectHiringAuthority.id}/inventory`)
    .loginVia(user, 'jwt')
    .send({
      hiring_authorities: inventory,
    })
    .end();
  response.assertStatus(200);
  response.assertJSONSubset({
    name: 'Search project hiring authorities & names test',
    is_private: true,
    created_by: user.id,
    searchProjectHiringAuthories: inventory.length,
  });
});

test('Should return 200 when deleting a SearchProject (Candidate)', async ({ client, user }) => {
  const response = await client.delete(`${baseUrl}/${searchProjectCandidate.id}`).loginVia(user, 'jwt').end();
  response.assertStatus(200);
  response.assertJSONSubset({
    name: 'Search project candidates test',
    is_private: false,
    created_by: user.id,
    searchProjectNames: [
      {
        name_id: putName.id,
        created_by: user.id,
      },
    ],
  });
});

test('Should return 200 when deleting a SearchProject (Candidate Copy)', async ({ client, user }) => {
  const response = await client.delete(`${baseUrl}/${searchProjectCandidateCopy.id}`).loginVia(user, 'jwt').end();
  response.assertStatus(200);
});

test('Should return 200 when deleting a SearchProject (HiringAuthority)', async ({ client, user }) => {
  const inventory = putHiringAuthorities.map((id) => ({
    hiring_authority_id: id,
    created_by: user.id,
  }));

  const response = await client.delete(`${baseUrl}/${searchProjectHiringAuthority.id}`).loginVia(user, 'jwt').end();
  response.assertStatus(200);
  response.assertJSONSubset({
    name: 'Search project hiring authorities & names test',
    is_private: true,
    created_by: user.id,
    searchProjectHiringAuthories: inventory,
    searchProjectNames: [
      {
        name_id: name.id,
        created_by: user.id,
      },
    ],
  });
});

after(async () => {
  if (searchProjectCandidate) {
    await searchProjectCandidate.delete();
  }

  if (searchProjectHiringAuthority) {
    await searchProjectHiringAuthority.delete();
  }
});
