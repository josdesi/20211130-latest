'use strict';
const { SendoutStatusSchemes } = use('App/Helpers/Globals');
const { FeeAmountConditionalFilters } = use('App/Helpers/HotSheet/FeeAmountConditionalFilters');

const FEE_AMOUNT_FIELD = 'so.fee_amount';
const FEE_AMOUNT_FIELD_50_PERCENT =
  'CASE WHEN so.job_order_accountable_id != so.candidate_accountable_id THEN so.fee_amount/2 ELSE so.fee_amount END';
const FEE_AMOUNT_FIELD_50_PERCENT_MULTIPLE_RECRUITERS =
  'CASE WHEN so.job_order_accountable_id IN (?) and so.candidate_accountable_id IN (?) THEN so.fee_amount ELSE so.fee_amount/2 END';
class FeeAmountQueryBuilder {
  addParamsForQuery(str, params) {
    return str.replace(/\?/g, params);
  }
  getQueryByFeeAmountField(filters) {
    if (this.isRecruiterCoachOrRegionalFilter(filters)) {
      if (this.areThereMultipleRecruiters(filters)) {
        return this.addParamsForQuery(FEE_AMOUNT_FIELD_50_PERCENT_MULTIPLE_RECRUITERS, filters.recruiterIds);
      }
      return FEE_AMOUNT_FIELD_50_PERCENT;
    }
    return FEE_AMOUNT_FIELD;
  }
  areThereMultipleRecruiters(filters) {
    return new FeeAmountConditionalFilters().areThereMultipleRecruiters(filters);
  }
  isRecruiterCoachOrRegionalFilter(filters) {
    return new FeeAmountConditionalFilters().isRecruiterCoachOrRegionalFilter(filters);
  }
}

class ActiveFeeAmountQueryBuilder extends FeeAmountQueryBuilder {
  getDatabaseQueryRaw(filters) {
    const queryFeeAmountField = this.getQueryByFeeAmountField(filters);
    return `SUM( CASE WHEN so.sendout_status_id = ${SendoutStatusSchemes.Active} THEN ${queryFeeAmountField} ELSE 0 END ) AS active_fees`;
  }
}

class PlacedFeeAmountQueryBuilder extends FeeAmountQueryBuilder {
  getDatabaseQueryRaw(filters) {
    const queryFeeAmountField = this.getQueryByFeeAmountField(filters);
    return `SUM( CASE WHEN so.sendout_status_id = ${SendoutStatusSchemes.Placed} THEN ${queryFeeAmountField} ELSE 0 END ) AS fees_total`;
  }
}

module.exports = {
  FeeAmountQueryBuilder,
  ActiveFeeAmountQueryBuilder,
  PlacedFeeAmountQueryBuilder,
};
