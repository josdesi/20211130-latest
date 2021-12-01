'use strict';

class StoreNameEmployerCompany {
  get rules() {
    return {
      company_id: 'required|integer|existsFd:companies,id',
      name_id: 'required|integer|existsFd:names,id',
    };
  }

  get data() {
    const requestBody = this.ctx.request.all();
    const id = this.ctx.params.id;

    return Object.assign({}, requestBody, { name_id: id });
  }

  get messages() {
    return {
      'company_id.required': 'You must provide an employer company',
      'company_id.integer': 'The company provided must be an id reference',
      'company_id.existsFd': 'The company provided does not exist',

      'name_id.required': 'You must provide an employee',
      'name_id.integer': 'The employee provided must be an id reference',
      'name_id.existsFd': 'The employee provided does not exist',
    };
  }

  async fails(errorMessages) {
    return this.ctx.response.status(400).send(errorMessages);
  }
}

module.exports = StoreNameEmployerCompany;
