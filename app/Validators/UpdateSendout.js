'use strict'

const { SendoutTypesSchemes } = use('App/Helpers/Globals');

const BaseValidator = use('./BaseValidator');


class UpdateSendout extends BaseValidator {
  get rules() {
    return {
      'status_id': 'required|integer',

      'interviews.*.interview_type_id': 'integer',
      'interviews.*.interview_date': 'date',
      'fee_amount': `required_when:type_id,${SendoutTypesSchemes.Sendout}|number`
    };
  }

  get messages() {
    return {
      'status_id.required': 'The sendout status is required to create a sendout',
      'status_id.integer': 'The sendout status id is not valid',

      'interviews.*.interview_type_id.integer': 'The interview type is not valid',
      'interviews.*.interview_date.date': 'The interview date is not valid',

      'fee_amount.required_when': 'The estimated full fee amount is required to create a sendout',
      'fee_amount.number': 'The estimated full fee amount should be a currency type'
    };
  }
}

module.exports = UpdateSendout
