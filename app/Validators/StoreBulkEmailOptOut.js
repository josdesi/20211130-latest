'use strict';
const Antl = use('Antl');

class StoreBulkEmailOptOut {
  get rules() {
    return {
      item_id: 'required_when:manual_email,null|integer',
      email_opt_out_type_id: 'required_when:manual_email,null|integer|existsFd:email_opt_out_types,id',
      manual_email: 'required_when:item_id,null|email',
      unsubscribe_reason_id: 'required|integer|existsFd:unsubscribe_reasons,id',
      custom_reason: 'string',
      notes: 'string',
    };
  }

  get messages() {
    return {
      'item_id.required_when': Antl.formatMessage('messages.validation.required', { field: 'item id' }),
      'manual_email.required_when': Antl.formatMessage('messages.validation.required', { field: 'manual email' }),
      'unsubscribe_reason_id.required': Antl.formatMessage('messages.validation.required', { field: 'reason id' }),
      'email_opt_out_type_id.required_when': Antl.formatMessage('messages.validation.required', {
        field: 'email opt out type id',
      }),

      'email_opt_out_type_id.existsFd': Antl.formatMessage('messages.validation.notExist', {
        entity: 'email opt out type id',
      }),
      'unsubscribe_reason_id.existsFd': Antl.formatMessage('messages.validation.notExist', { entity: 'reason id' }),

      'custom_reason.string': Antl.formatMessage('messages.validation.format', {
        field: 'custom reason',
        format: 'string',
      }),
      'notes.string': Antl.formatMessage('messages.validation.format', {
        field: 'notes',
        format: 'string',
      }),

      'item_id.integer': Antl.formatMessage('messages.validation.format', {
        field: 'item id',
        format: 'integer',
      }),
      'email_opt_out_type_id.integer': Antl.formatMessage('messages.validation.format', {
        field: 'email opt out type id',
        format: 'integer',
      }),
      'unsubscribe_reason_id.integer': Antl.formatMessage('messages.validation.format', {
        field: 'reason id',
        format: 'integer',
      }),
    };
  }

  async fails(errorMessages) {
    return this.ctx.response.status(400).send(errorMessages);
  }
}

module.exports = StoreBulkEmailOptOut;
