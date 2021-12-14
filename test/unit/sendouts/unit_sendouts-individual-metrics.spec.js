'use strict';
const { test, describe } = use('Test/Suite')(
  'USER STORY 3626 - A user can filter the HotSheet to view individual metrics'
);
const { FeeAmountQueryBuilder, ActiveFeeAmountQueryBuilder, PlacedFeeAmountQueryBuilder } = use(
  'App/Helpers/HotSheet/FeeAmountQueryBuilder'
);
const { FeeAmountConditionalFilters, FeeAmountConditionalCopy } = use(
  'App/Helpers/HotSheet/FeeAmountConditionalFilters'
);
const { FeeAmountConditionalStub } = use('App/Helpers/HotSheet/FeeAmountConditionalStub');
const { userFilters, SendoutStatusSchemes } = use('App/Helpers/Globals');
const Database = use('Database');

const QUERY_RAW_SPLIT_50PERCENT =
  'CASE WHEN so.job_order_accountable_id != so.candidate_accountable_id THEN so.fee_amount/2 ELSE so.fee_amount END';
const QUERY_RAW_SPLIT_50PERCENT_MULTIPLE_RECRUITERS =
  'CASE WHEN so.job_order_accountable_id IN (?) and so.candidate_accountable_id IN (?) THEN so.fee_amount ELSE so.fee_amount/2 END';
const QUERY_RAW_SPLIT_50PERCENT_REGIONAL =
  'CASE WHEN rejo.regional_id != reca.regional_id THEN so.fee_amount/2 ELSE so.fee_amount END';
const QUERY_RAW_SPLIT_50PERCENT_COACH =
  'CASE WHEN rejo.coach_id != reca.coach_id THEN so.fee_amount/2 ELSE so.fee_amount END';

const QUERY_RAW_ACTIVE_FEES = `SUM( CASE WHEN so.sendout_status_id = ${SendoutStatusSchemes.Active} THEN so.fee_amount ELSE 0 END ) AS active_fees`;
const QUERY_RAW_ACTIVE_FEES_50PERCENT = `SUM( CASE WHEN so.sendout_status_id = ${SendoutStatusSchemes.Active} THEN ${QUERY_RAW_SPLIT_50PERCENT} ELSE 0 END ) AS active_fees`;
const QUERY_RAW_TOTAL_ACTIVE_FEE_AMOUNT_50PERCENT_MULTIPLE_RECRUITERS = `SUM( CASE WHEN so.sendout_status_id = ${SendoutStatusSchemes.Active} THEN ${QUERY_RAW_SPLIT_50PERCENT_MULTIPLE_RECRUITERS} ELSE 0 END ) AS active_fees`;
const QUERY_RAW_TOTAL_ACTIVE_FEE_AMOUNT_50PERCENT_REGIONAL = `SUM( CASE WHEN so.sendout_status_id = ${SendoutStatusSchemes.Active} THEN ${QUERY_RAW_SPLIT_50PERCENT_REGIONAL} ELSE 0 END ) AS active_fees`;
const QUERY_RAW_TOTAL_ACTIVE_FEE_AMOUNT_50PERCENT_COACH = `SUM( CASE WHEN so.sendout_status_id = ${SendoutStatusSchemes.Active} THEN ${QUERY_RAW_SPLIT_50PERCENT_COACH} ELSE 0 END ) AS active_fees`;

const QUERY_RAW_TOTAL_FEE_AMOUNT = `SUM( CASE WHEN so.sendout_status_id = ${SendoutStatusSchemes.Placed} THEN so.fee_amount ELSE 0 END ) AS fees_total`;
const QUERY_RAW_TOTAL_FEE_AMOUNT_50PERCENT = `SUM( CASE WHEN so.sendout_status_id = ${SendoutStatusSchemes.Placed} THEN ${QUERY_RAW_SPLIT_50PERCENT} ELSE 0 END ) AS fees_total`;
const QUERY_RAW_TOTAL_PLACED_FEE_AMOUNT_50PERCENT_MULTIPLE_RECRUITERS = `SUM( CASE WHEN so.sendout_status_id = ${SendoutStatusSchemes.Placed} THEN ${QUERY_RAW_SPLIT_50PERCENT_MULTIPLE_RECRUITERS} ELSE 0 END ) AS fees_total`;
const QUERY_RAW_TOTAL_PLACED_FEE_AMOUNT_50PERCENT_REGIONAL = `SUM( CASE WHEN so.sendout_status_id = ${SendoutStatusSchemes.Placed} THEN ${QUERY_RAW_SPLIT_50PERCENT_REGIONAL} ELSE 0 END ) AS fees_total`;
const QUERY_RAW_TOTAL_PLACED_FEE_AMOUNT_50PERCENT_COACH = `SUM( CASE WHEN so.sendout_status_id = ${SendoutStatusSchemes.Placed} THEN ${QUERY_RAW_SPLIT_50PERCENT_COACH} ELSE 0 END ) AS fees_total`;

const testAsserts = (values, func) => {
  for (let value of values) {
    func.apply(Object, [value]);
  }
}

const getQueryActive = (filters) => {
  const feeAmount = new ActiveFeeAmountQueryBuilder();
  const criteria = new FeeAmountConditionalFilters();
  let query = QUERY_RAW_ACTIVE_FEES_50PERCENT;
  if (criteria.areThereMultipleRecruiters(filters))
    query = feeAmount.addParamsForQuery(
      QUERY_RAW_TOTAL_ACTIVE_FEE_AMOUNT_50PERCENT_MULTIPLE_RECRUITERS,
      filters.recruiterIds
    );
  if(criteria.isRecruiter(filters))
      return query;
  if (criteria.isRegional(filters))
    query = feeAmount.addParamsForQuery(QUERY_RAW_TOTAL_ACTIVE_FEE_AMOUNT_50PERCENT_REGIONAL, filters.recruiterIds);
  if (criteria.isCoach(filters))
    query = feeAmount.addParamsForQuery(QUERY_RAW_TOTAL_ACTIVE_FEE_AMOUNT_50PERCENT_COACH, filters.recruiterIds);
  return query;
}

const getQueryPlaced = (filters) => {
  const feeAmount = new PlacedFeeAmountQueryBuilder();
  const criteria = new FeeAmountConditionalFilters();
  let query = QUERY_RAW_TOTAL_FEE_AMOUNT_50PERCENT;
  if (criteria.areThereMultipleRecruiters(filters))
    query = feeAmount.addParamsForQuery(
      QUERY_RAW_TOTAL_PLACED_FEE_AMOUNT_50PERCENT_MULTIPLE_RECRUITERS,
      filters.recruiterIds
    );
  if(criteria.isRecruiter(filters))
    return query;
  if (criteria.isRegional(filters))
    query = feeAmount.addParamsForQuery(QUERY_RAW_TOTAL_PLACED_FEE_AMOUNT_50PERCENT_REGIONAL, filters.recruiterIds);
  if (criteria.isCoach(filters))
    query = feeAmount.addParamsForQuery(QUERY_RAW_TOTAL_PLACED_FEE_AMOUNT_50PERCENT_COACH, filters.recruiterIds);
  return query;
}

const feeAmountConditionalStub = new FeeAmountConditionalStub();
const filterStubs = feeAmountConditionalStub.getfilterStubs();
const filterStubsExceptions = feeAmountConditionalStub.getFilterStubsExceptions();

testAsserts(filterStubs, ([stub, desc, expectedResult]) => {
  test(`isRecruiterCoachOrRegionalFilter method should return true for ${desc} filter`, async ({ assert }) => {
    // Arrange
    const filters = stub;
    const feeAmount = new FeeAmountQueryBuilder();
    // Act
    const isFilterValid = feeAmount.isRecruiterCoachOrRegionalFilter(filters);
    // Assert
    assert.equal(isFilterValid, expectedResult.isFilterValid);
  });
});

testAsserts(filterStubs, ([stub, desc, expectedResult]) => {
  test(`areThereMultipleRecruiters method should return ${expectedResult.areThereMultipleRecruiters} for ${desc} filter`, async ({
    assert,
  }) => {
    // Arrange
    const filters = stub;
    const feeAmount = new FeeAmountConditionalFilters();
    // Act
    const isFilterValid = feeAmount.areThereMultipleRecruiters(filters);
    // Assert
    assert.equal(isFilterValid, expectedResult.areThereMultipleRecruiters);
  });
});

testAsserts(filterStubs, ([stub, desc, expectedResult]) => {
  test(`should return the valid copy for ${desc} filter`, async ({ assert }) => {
    // Arrange
    const filters = stub;
    const feeAmountCopy = new FeeAmountConditionalCopy();
    // Act
    const copy = feeAmountCopy.getConditionalCopy(filters);
    // Assert
    assert.equal(copy, expectedResult.copy);
  });
});



testAsserts([
  [{coachIds:[]},'coachIds:[]',false],
  [{regionalDirectorIds:[]},'regionalDirectorIds:[]',false],
  [{recruiterIds:[]},'recruiterIds:[]',false],
  [{coachIds:null},'coachIds: null',false],
  [{regionalDirectorIds:null},'regionalDirectorIds: null',false],
  [{recruiterIds:null},'recruiterIds: null',false],
  [{coachIds:[], recruiterIds:null},'coachIds:[], recruiterIds:null',false],
  [{coachIds:null,regionalDirectorIds:[],recruiterIds:[]},'coachIds:null,regionalDirectorIds:[],recruiterIds:[]',false],
], ([stub, desc, expectedResult]) => {
  test(`isRecruiterCoachOrRegionalFilter method should return false for ${desc} filter`, async ({ assert }) => {
    // Arrange
    const filters = stub;
    const feeAmount = new FeeAmountQueryBuilder();
    // Act
    const isFilterValid = feeAmount.isRecruiterCoachOrRegionalFilter(filters);
    // Assert
    assert.equal(isFilterValid, expectedResult);
  });
});


testAsserts(filterStubsExceptions, ([stub, desc, expectedResult]) => {
  test(`isRecruiterCoachOrRegionalFilter method should return ${expectedResult} for ${desc} filter`, async ({ assert }) => {
    // Arrange
    const filters = stub;
    const feeAmount = new FeeAmountQueryBuilder();
    // Act
    const isFilterValid = feeAmount.isRecruiterCoachOrRegionalFilter(filters);
    // Assert
    assert.equal(isFilterValid, expectedResult);
  });
});

// Active
testAsserts(filterStubs, ([stub, desc]) => {
  test(`getDatabaseQueryRaw method should return active fees database query raw with 50 percent for ${desc} filter`, async ({
    assert,
  }) => {
    // Arrange
    const filters = stub;
    const feeAmount = new ActiveFeeAmountQueryBuilder();
    // Act
    const dataBaseQueryRaw = feeAmount.getDatabaseQueryRaw(filters);
    let query = getQueryActive(filters);

    // Assert
    assert.equal(dataBaseQueryRaw, query);
  });
});

testAsserts(filterStubsExceptions, ([stub, desc, expectedResult]) => {
  test(`getDatabaseQueryRaw method should return active fees database query raw without 50 percent for ${desc} filter`, async ({
    assert,
  }) => {
    // Arrange
    const filters = stub;
    const feeAmount = new ActiveFeeAmountQueryBuilder();
    // Act
    const dataBaseQueryRaw = feeAmount.getDatabaseQueryRaw(filters);
    let query = expectedResult ? getQueryActive(filters) : QUERY_RAW_ACTIVE_FEES;

    // Assert
    assert.equal(dataBaseQueryRaw, query);
  });
});


// Placed
testAsserts(filterStubs, ([stub, desc]) => {
  test(`getDatabaseQueryRaw method should return total fees amount database query raw with 50 percent for ${desc} filter`, async ({
    assert,
  }) => {
    // Arrange
    const filters = stub;
    const feeAmount = new PlacedFeeAmountQueryBuilder();
    // Act
    const dataBaseQueryRaw = feeAmount.getDatabaseQueryRaw(filters);
    const query = getQueryPlaced(filters);
    // Assert
    assert.equal(dataBaseQueryRaw, query);
  });
});

testAsserts(filterStubsExceptions, ([stub, desc, expectedResult]) => {
  test(`getDatabaseQueryRaw method should return total fees amount database query raw without 50 percent for ${desc} filter`, async ({
    assert,
  }) => {
    // Arrange
    const filters = stub;
    const feeAmount = new PlacedFeeAmountQueryBuilder();
    // Act
    const dataBaseQueryRaw = feeAmount.getDatabaseQueryRaw(filters);
    let query = expectedResult ? getQueryPlaced(filters) : QUERY_RAW_TOTAL_FEE_AMOUNT;
    // Assert
    assert.equal(dataBaseQueryRaw, query);
  });
});
