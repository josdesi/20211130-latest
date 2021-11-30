'use strict';

class StoreCandidateEmployerCompany {
  get rules() {
    return {
      company_id: 'required|integer|existsFd:companies,id',
      candidate_id: 'required|integer|existsFd:candidates,id',
    };
  }

  get data() {
    const requestBody = this.ctx.request.all();
    const id = this.ctx.params.id;

    return Object.assign({}, requestBody, { candidate_id: id });
  }

  get messages() {
    return {
      'company_id.required': 'You must provide an employer company',
      'company_id.integer': 'The company provided must be an id reference',
      'company_id.existsFd': 'The company provided does not exist',

      'candidate_id.required': 'You must provide an employee',
      'candidate_id.integer': 'The employee provided must be an id reference',
      'candidate_id.existsFd': 'The employee provided does not exist',
    };
  }

  async fails(errorMessages) {
    return this.ctx.response.status(400).send(errorMessages);
  }
}

module.exports = StoreCandidateEmployerCompany;
