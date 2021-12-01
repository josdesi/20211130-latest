'use strict';

class StoreBulkEmailOptOut {
  get rules() {
    return {
      email: 'required|max:128|email',
      email_history_id: 'integer',
      unsubscribe_reason_id: 'required|integer|existsFd:unsubscribe_reasons,id',
      custom_reason: 'string',
    };
  }

  get messages() {
    return {
      'email.required': 'You must provide a name.',
      'unsubscribe_reason_id.required': 'You must provide a reason',

      'unsubscribe_reason_id.existsFd': 'The reason provided is not valid',

      'custom_reason.email': 'The provided email is not valid',

      'custom_reason.max': 'The provided email is has too many characters',

      'custom_reason.string': 'The custom reason is not a valid string',

      'email_history_id.integer': 'The item must be passed as a integer',
      'unsubscribe_reason_id.integer': 'The selected unsubscribe reason must be passed as a integer',
    };
  }

  async fails(errorMessages) {
    return this.ctx.response.status(400).send(errorMessages);
  }
}

module.exports = StoreBulkEmailOptOut;
