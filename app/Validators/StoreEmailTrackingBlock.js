'use strict';

const BaseValidator = use('./BaseValidator');
const Antl = use('Antl');
const { get } = use('lodash');

class StoreEmailTrackingBlock extends BaseValidator {
  get rules() {
    return {
      email: 'required|email|uniqueCaseInsensitive:email_tracking_block_lists,email',
      notes: 'string',
    };
  }

  get messages() {
    return {
      'email.required': Antl.formatMessage('messages.validation.required', { field: 'email' }),
      'email.email': Antl.formatMessage('messages.validation.format', { field: 'email', format: 'email' }),
      'email.uniqueCaseInsensitive': (field) => {
        return Antl.formatMessage('messages.validation.unique', { field: 'email', value: get(this.body, field) });
      },

      'notes.string': Antl.formatMessage('messages.validation.format', { field: 'notes', format: 'string' }),
    };
  }
}

module.exports = StoreEmailTrackingBlock;
