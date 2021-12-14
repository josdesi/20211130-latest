'use strict';
const Antl = use('Antl');

class GetBodyPreview {
  get rules() {
    return {
      search_project_id: 'required|integer|existsFd:search_projects,id',
      body: 'required|string',
    };
  }

  get messages() {
    return {
      'search_project_id.required': Antl.formatMessage('messages.validation.required', {
        field: 'search project id',
      }),
      'body.required': Antl.formatMessage('messages.validation.required', {
        field: 'body',
      }),

      'search_project_id.existsFd': Antl.formatMessage('messages.validation.notExist', { entity: 'search project' }),
    };
  }

  async fails(errorMessages) {
    return this.ctx.response.status(400).send(errorMessages);
  }
}

module.exports = GetBodyPreview;
