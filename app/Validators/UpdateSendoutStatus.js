'use strict'

const BaseValidator = use('./BaseValidator');

class UpdateSendoutStatus extends BaseValidator {
  get rules() {
    return {
      'status_id': 'required|integer',
      'decline_reason': 'required_when:status_id,3|string',
      'compensation': 'required_when:status_id,4',
    };
  }

  get messages() {
    return {
      'status_id.required': 'The status is required',
      'decline_reason.required_when': 'Please specify the reason of the DeclinedOffer',
      'compensation.required': 'Compensation is required',
    };
  }
}

module.exports = UpdateSendoutStatus
