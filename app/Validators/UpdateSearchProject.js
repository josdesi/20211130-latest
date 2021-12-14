'use strict';

const Antl = use('Antl');
class UpdateSearchProject {

  get sanitizationRules() {
    return {
      isPrivate: 'to_boolean',
    };
  }

  get rules() {
    return {
      name: 'required|max:255|string',
      ownerId: 'required|integer',
      isPrivate: 'required|boolean',
    };
  }

  get messages() {
    return {
      'name.required': Antl.formatMessage('messages.validation.required', { field: 'name' }),
      'ownerId.required': Antl.formatMessage('messages.validation.required', { field: 'owner' }),
      'ownerId.number': Antl.formatMessage('messages.validation.type', { field: 'owner', type: 'number' }),
      'isPrivate.required': Antl.formatMessage('messages.validation.required', { field: 'visibility' }),
      'isPrivate.boolean': Antl.formatMessage('messages.validation.type', { field: 'visibility', type: 'boolean' }),
    };
  }
  

  async fails(errorMessages) {
    return this.ctx.response.status(400).send(errorMessages);
  }
}

module.exports = UpdateSearchProject;
