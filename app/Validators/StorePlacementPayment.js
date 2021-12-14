'use strict'

const Antl = use('Antl');
const BaseValidator = use('./BaseValidator');

class StorePlacementPayment extends BaseValidator {
  get rules () {
    return {
      // validation rules
      amount: 'required|number',
    }
  }

  get messages() {
    return {
      'amount.required': Antl.formatMessage('messages.validation.required', {
        field: 'payment amount',
      }),
      'amount.number': Antl.formatMessage('messages.validation.type', { field: 'payment amount', type: 'number' }),
    };
  }
}

module.exports = StorePlacementPayment
