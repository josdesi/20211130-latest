'use strict';

class GetSuggestedCandidateCompanies {
  get rules() {
    return {
      limit: 'integer',
      candidateId: 'required|integer|existsFd:candidates,id',
    };
  }

  get data() {
    const requestBody = this.ctx.request.all();
    const id = this.ctx.params.id;

    return Object.assign({}, requestBody, { candidateId: id });
  }

  get messages() {
    return {
      'candidateId.integer': 'The candidate id must be a valid number',
      'limit.integer': 'The limit must be a valid number',

      'candidateId.required': 'The candidate id is required',

      'candidateId.existsFd': 'The candidate id passed does not exists',
    };
  }

  async fails(errorMessages) {
    return this.ctx.response.status(400).send(errorMessages);
  }
}

module.exports = GetSuggestedCandidateCompanies;
