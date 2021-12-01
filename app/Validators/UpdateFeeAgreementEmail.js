'use strict'

const BaseValidator = use('./BaseValidator');

class UpdateFeeAgreementEmail extends BaseValidator {
  get rules() {
    return {
      email: 'required|max:128|email',
    };
  }

  get messages() {
    return {
      'email.required': 'An email is required',
      'email.email': 'The email seems not to be valid'
    };
  }
}

module.exports = UpdateFeeAgreementEmail;