'use strict'

class ListFeeAgreements {
  get rules() {
    return {
      fee_agreement_status_id: 'integer',
      fee_agreement_status_ids: 'arrayOfIntegers',
      recruiter_id: 'integer',
      coach_id: 'integer',
      regional_director_id: 'integer',
      min_fee_percentage: 'integer',
      max_fee_percentage: 'integer',
      min_guarantee_days: 'integer',
      max_guarantee_days: 'integer',
      company_id: 'integer',
      page: 'integer',
      perPage: 'integer'
    };
  }



  get messages() {
    return {
      'fee_agreement_status_id.integer': 'Only integers are allowed',
      'recruiter_id.integer': 'Only integers are allowed',
      'coach_id.integer': 'Only integers are allowed',
      'regional_director_id.integer': 'Only integers are allowed',
      'min_fee_percentage.integer': 'Only integers are allowed',
      'max_fee_percentage.integer': 'Only integers are allowed',
      'min_guarantee_days.integer': 'Only integers are allowed',
      'max_guarantee_days.integer': 'Only integers are allowed',
      'page.integer': 'Only integers are allowed',
      'perPage.integer': 'Only integers are allowed'
    };
  }

  async fails(errorMessages) {
    return this.ctx.response.status(400).send(errorMessages);
  }
}

module.exports = ListFeeAgreements
