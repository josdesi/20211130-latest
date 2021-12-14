'use strict';
const { SendoutStatusSchemes } = use('App/Helpers/Globals');
const { FeeAmountConditionalFilters } = use('App/Helpers/HotSheet/FeeAmountConditionalFilters');

const FEE_AMOUNT_FIELD = 'so.fee_amount';
const FEE_AMOUNT_FIELD_50_PERCENT =
  'CASE WHEN so.job_order_accountable_id != so.candidate_accountable_id THEN so.fee_amount/2 ELSE so.fee_amount END';
const FEE_AMOUNT_FIELD_50_PERCENT_REGIONAL =
  'CASE WHEN rejo.regional_id != reca.regional_id THEN so.fee_amount/2 ELSE so.fee_amount END';
const FEE_AMOUNT_FIELD_50_PERCENT_COACH =
  'CASE WHEN rejo.coach_id != reca.coach_id THEN so.fee_amount/2 ELSE so.fee_amount END';
const FEE_AMOUNT_FIELD_50_PERCENT_MULTIPLE_RECRUITERS =
  'CASE WHEN so.job_order_accountable_id IN (?) and so.candidate_accountable_id IN (?) THEN so.fee_amount ELSE so.fee_amount/2 END';
class FeeAmountQueryBuilder {
  addParamsForQuery(str, params) {
    return str.replace(/\?/g, params);
  }
  getQueryByFeeAmountField(filters) {
    const criteria = new FeeAmountConditionalFilters();
    if (criteria.isRecruiterCoachOrRegionalFilter(filters)) {

      if (criteria.areThereMultipleRecruiters(filters))
        return this.addParamsForQuery(FEE_AMOUNT_FIELD_50_PERCENT_MULTIPLE_RECRUITERS, filters.recruiterIds);

      if( criteria.isRecruiter(filters)) return FEE_AMOUNT_FIELD_50_PERCENT;
            
      if (criteria.isRegional(filters)) return FEE_AMOUNT_FIELD_50_PERCENT_REGIONAL;

      if (criteria.isCoach(filters)) return FEE_AMOUNT_FIELD_50_PERCENT_COACH;

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
