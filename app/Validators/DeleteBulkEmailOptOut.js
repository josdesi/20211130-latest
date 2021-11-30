'use strict';

const Antl = use('Antl');

class DeleteBulkEmailOptOut {
  get rules() {
    return {
      is_unsubscribe: 'required|boolean',
    };
  }

  get messages() {
    return {
      'is_unsubscribe.required': Antl.formatMessage('messages.validation.required', {
        field: 'is unsubscribe',
      }),

      'is_unsubscribe.boolean': Antl.formatMessage('messages.validation.type', {
        field: 'is unsubscribe',
        type: 'boolean',
      }),
    };
  }

  async fails(errorMessages) {
    return this.ctx.response.status(400).send(errorMessages);
  }
}

module.exports = DeleteBulkEmailOptOut;
