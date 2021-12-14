'use strict'

const Antl = use('Antl');

class StoreSuggestionUpdate {
  get rules () {
    return {
      description: 'required|string'
    }
  }

  get messages() {
    return {
      'description.required': Antl.formatMessage('messages.validation.required', {
        field: 'description',
      }),
      'description.string': Antl.formatMessage('messages.validation.type', { field: 'description', type: 'string' }),
    };
  }

  async fails(errorMessages) {
    return this.ctx.response.status(400).send(errorMessages);
  }
}

module.exports = StoreSuggestionUpdate
