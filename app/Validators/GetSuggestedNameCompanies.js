'use strict';

class GetSuggestedNameCompanies {
  get rules() {
    return {
      limit: 'integer',
      nameId: 'required|integer|existsFd:names,id',
    };
  }

  get data() {
    const requestBody = this.ctx.request.all();
    const id = this.ctx.params.id;

    return Object.assign({}, requestBody, { nameId: id });
  }

  get messages() {
    return {
      'nameId.integer': 'The name id must be a valid number',
      'limit.integer': 'The limit must be a valid number',

      'nameId.required': 'The name id is required',

      'nameId.existsFd': 'The name id passed does not exists',
    };
  }

  async fails(errorMessages) {
    return this.ctx.response.status(400).send(errorMessages);
  }
}

module.exports = GetSuggestedNameCompanies;
