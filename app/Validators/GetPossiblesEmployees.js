'use strict';

class GetPossiblesEmployees {
  get rules() {
    return {
      company_id: 'required|integer|existsFd:companies,id',
      keyword: 'string',
      limit: 'integer',
    };
  }

  get messages() {
    return {
      'limit.integer': 'The limit passed must be a number',
      'company_id.integer': 'The company reference must be a number',

      'company_id.required': 'You must pass the company reference to filter out its current employees',

      'keyword.string': 'The keyword passed must be an string',

      'company_id.existsFd': 'The company passed does not exists',
    };
  }

  async fails(errorMessages) {
    return this.ctx.response.status(400).send(errorMessages);
  }
}

module.exports = GetPossiblesEmployees;
