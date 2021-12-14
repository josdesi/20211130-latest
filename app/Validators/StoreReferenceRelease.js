'use strict'

const Antl = use('Antl');

class StoreReferenceRelease {
  get sanitizationRules () {
    return {
      body: 'stripHtmlTags',
    }
  }
  
  get rules () {
    return {
      // validation rules
      to: `required|array`,
      cc: `array`,
      bcc: `array`,
      subject: `required|string`,
      body: `required|string`,
      id: 'integer|existsFd:candidates,id'
    }
  }

  get data() {
    const requestBody = this.ctx.request.all();
    const id = this.ctx.params.id;

    return Object.assign({}, requestBody, { id });
  }

  get messages() {
    return {
      'to.required': Antl.formatMessage('messages.validation.required', {
        field: 'to',
      }),
      'to.array': Antl.formatMessage('messages.validation.type', { field: 'to', type: 'array' }),
      'cc.array': Antl.formatMessage('messages.validation.type', { field: 'cc', type: 'array' }),
      'bcc.array': Antl.formatMessage('messages.validation.type', { field: 'bcc', type: 'array' }),

      'subject.required': Antl.formatMessage('messages.validation.required', {
        field: 'subject',
      }),
      'subject.string': Antl.formatMessage('messages.validation.type', { field: 'subject', type: 'string' }),
      'body.required': Antl.formatMessage('messages.validation.required', {
        field: 'body',
      }),
      'body.string': Antl.formatMessage('messages.validation.type', { field: 'body', type: 'string' }),

      'id.integer': Antl.formatMessage('messages.validation.type', { field: 'candidate key', type: 'integer' }),
      'id.existsFd': Antl.formatMessage('messages.validation.notExist', { entity: 'candidate' })
    };
  }

  async fails(errorMessages) {
    return this.ctx.response.status(400).send(errorMessages);
  }
}

module.exports = StoreReferenceRelease
