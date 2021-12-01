const Env = use('Env');
const { parseBoolean } = use('App/Helpers/Globals');
const { test, trait } = use('Test/Suite')('  USER STORY 3626 - A user can filter the HotSheet to view individual metrics');
const { userFilters, SendoutStatusSchemes } = use('App/Helpers/Globals');
const { FeeAmountConditionalCopy } = use('App/Helpers/HotSheet/FeeAmountConditionalFilters');
const { FeeAmountConditionalStub } = use('App/Helpers/HotSheet/FeeAmountConditionalStub');

const Helpers = use('Helpers');
const url = 'api/v1';
const baseUrl = `${url}`;
const path = `sendouts/summary`;

const useIndividualMetrics = parseBoolean(Env.get('FEAT_INDIVIDUAL_METRICS'));
function testAsserts(values, func) {
  for (let value of values) 
    useIndividualMetrics && func.apply(Object, [value]);
}
const feeAmountConditionalStub = new FeeAmountConditionalStub();
const users = feeAmountConditionalStub.getUsers();
const filterStubs = feeAmountConditionalStub.getFilterMetricsCountStub();

const direction = 'desc';
const endDate = '2021-11-18 23:59:59';
const keyword = '';
const orderBy = 'tracking_date';
const page = '1';
const perPage = '10';
const startDate = '2021-01-01 00:00:00';
const typeId = '1';

trait('Test/ApiClient');
trait('Auth/Client');
trait('Test/Traits/User');

testAsserts(filterStubs, ([stub, desc, expectedResult]) => {
  test(`Should return the correct metrics count by filter ${desc}`, async ({ client, user }) => {
    // Arrange
    const userFilter = stub.userFilter;
    let filter = `?direction=${direction}&end_date=${endDate}&keyword=${keyword}&orderBy=${orderBy}&page=${page}&perPage=${perPage}&start_date=${startDate}&typeId=${typeId}&userFilter=${userFilter}`;
    if ('statusIds' in stub) filter += `&statusIds=${stub.statusIds}`;
    if ('recruiterIds' in stub) filter += `&recruiterIds=${stub.recruiterIds}`;
    const url = `${baseUrl}/${path}/${filter}`;

    // Act
    user.id = users.coach.JossueHernandez.userId;
    const response = await client.get(url).loginVia(user, 'jwt').end();
    // Assert
    response.assertStatus(200);
    response.assertJSONSubset([
      {
        key: 'metrics',
        rows: [
          { value: expectedResult.metrics.activeFees },
          { value: expectedResult.metrics.normalMetric },
          { value: expectedResult.metrics.totalFees },
          { value: expectedResult.metrics.averageFee },
        ],
      },
    ]);
  });
});
useIndividualMetrics &&
  test(`Should return the correct copy by filter All Sendouts, active status and single recruiter `, async ({
    client,
    user,
  }) => {
    // Arrange
    const stub = {
      userFilter: userFilters.All,
      statusIds: SendoutStatusSchemes.Placed,
      recruiterIds: users.recruiter.GhostRecruiter2A.userId,
    };
    const expectedResult = {
      metrics: { activeFees: '0.00', normalMetric: '0.00', totalFees: '8700.00', averageFee: '8700.00' },
      copy: new FeeAmountConditionalCopy().copy.generic,
    };
    const userFilter = stub.userFilter;
    let filter = `?direction=${direction}&end_date=${endDate}&keyword=${keyword}&orderBy=${orderBy}&page=${page}&perPage=${perPage}&start_date=${startDate}&typeId=${typeId}&userFilter=${userFilter}`;
    if ('statusIds' in stub) filter += `&statusIds=${stub.statusIds}`;
    if ('recruiterIds' in stub) filter += `&recruiterIds=${stub.recruiterIds}`;
    const url = `${baseUrl}/${path}/${filter}`;

    // Act
    user.id = users.coach.JossueHernandez.userId;
    const response = await client.get(url).loginVia(user, 'jwt').end();

    // Assert
    response.assertStatus(200);
    response.assertJSONSubset([
      {
        key: 'metrics',
        rows: [
          { value: expectedResult.metrics.activeFees },
          { value: expectedResult.metrics.normalMetric },
          { value: expectedResult.metrics.totalFees },
          { value: expectedResult.metrics.averageFee },
        ],
      },
    ]);
  });

testAsserts(filterStubs, ([stub, desc, expectedResult]) => {
  test(`Should return the correct copy by filter ${desc}`, async ({ client, user }) => {
    // Arrange
    const userFilter = stub.userFilter;
    let filter = `?direction=${direction}&end_date=${endDate}&keyword=${keyword}&orderBy=${orderBy}&page=${page}&perPage=${perPage}&start_date=${startDate}&typeId=${typeId}&userFilter=${userFilter}`;
    if ('statusIds' in stub) filter += `&statusIds=${stub.statusIds}`;
    if ('recruiterIds' in stub) filter += `&recruiterIds=${stub.recruiterIds}`;
    const url = `${baseUrl}/${path}/${filter}`;

    // Act
    user.id = users.coach.JossueHernandez.userId;
    const response = await client.get(url).loginVia(user, 'jwt').end();

    // Assert
    response.assertStatus(200);
    response.assertJSONSubset([
      {
        key: 'metrics',
        copy: expectedResult.copy,
      },
    ]);
  });
});
