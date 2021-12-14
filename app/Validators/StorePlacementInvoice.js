'use strict'

const Antl = use('Antl');
const BaseValidator = use('./BaseValidator');

class StorePlacementInvoice extends BaseValidator{
  get rules () {
    return {
      // validation rules
      invoice_number: 'required',
    }
  }

  get messages() {
    return {
      'invoice_number.required': Antl.formatMessage('messages.validation.required', {
        field: 'invoice number',
      })
    };
  }
}

module.exports = StorePlacementInvoice
