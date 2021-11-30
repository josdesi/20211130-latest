'use strict';

class StoreTypeReassure {
  get rules() {
    return {
      company_id: 'required|integer|existsFd:companies,id',
      company_type_id: 'required|integer|existsFd:company_types,id',
    };
  }

  get data() {
    const requestBody = this.ctx.request.all();
    const id = this.ctx.params.id;

    return Object.assign({}, requestBody, { company_id: id });
  }

  get messages() {
    return {
      'company_id.required': 'You must pass a company',
      'company_id.integer': 'The company reference must be a valid number',
      'company_id.existsFd': 'The company passed does not exists',

      'company_type_id.required': 'You must pass a company type',
      'company_type_id.integer': 'The company type reference must be a valid number',
      'company_type_id.existsFd': 'The company type passed does not exists',
    };
  }

  async fails(errorMessages) {
    return this.ctx.response.status(400).send(errorMessages);
  }
}

module.exports = StoreTypeReassure;
