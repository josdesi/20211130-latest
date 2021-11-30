'use strict'

class SendFeeAgreementToRegionalDirectorValidation {
  get rules() {
    return {
      guarantee_days: 'integer',
      fee_percentage: 'number',
      verbiage_changes: 'string',
    };
  }



  get messages() {
    return {
      'guarantee_days.integer': 'Guarantee days must be an integer',
      'fee_percentage.number': 'Fee percentage is mandatory',
      'verbiage_changes.string': 'Verbiage Changes must be string',
    };
  }

  async fails(errorMessages) {
    return this.ctx.response.status(400).send(errorMessages);
  }
}

module.exports = SendFeeAgreementToRegionalDirectorValidation
