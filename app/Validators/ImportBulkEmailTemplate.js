'use strict'

const Antl = use('Antl');

class ImportBulkEmailTemplate {
  get rules() {
    return {
      userId: 'required|integer',
      templates: 'required|array',
      'templates.*.name': 'required|max:254|string',
      'templates.*.subject': 'required|max:254|string',
      'templates.*.text': 'required|string',
      'templates.*.html': 'required|string'
    };
  }

  get messages() {
    return {
      'userId.required': Antl.formatMessage('messages.validation.required', { field: 'user' }),
      'userId.integer': Antl.formatMessage('messages.validation.type', { field: 'user', type: 'number'}),

      'templates.required': Antl.formatMessage('messages.validation.required', { field: 'templates' }),
      'templates.array': Antl.formatMessage('messages.validation.type', { field: 'user', type: 'array'}),
      'templates.*.name.required': Antl.formatMessage('messages.validation.required', { field: 'template name' }),
      'templates.*.name.max': Antl.formatMessage('messages.validation.max', { field: 'template name',size: '{{ argument.0 }}'}),
      'templates.*.name.subject': Antl.formatMessage('messages.validation.required', { field: 'template subject' }),
      'templates.*.subject.max': Antl.formatMessage('messages.validation.max', { field: 'template subject',size: '{{ argument.0 }}'}),
      'templates.*.name.text': Antl.formatMessage('messages.validation.required', { field: 'template text' }),
      'templates.*.name.html': Antl.formatMessage('messages.validation.required', { field: 'template body' }),
    };
  }

  async fails(errorMessages) {
    return this.ctx.response.status(400).send(errorMessages[0]);
  }
}

module.exports = ImportBulkEmailTemplate
