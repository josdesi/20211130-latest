'use strict';

class GetTypeReassureInformation {
  get rules() {
    return {
      companyId: 'required|integer|existsFd:companies,id',
      companyTypeReassureId: 'required|integer|existsFd:company_type_reassures,id',
    };
  }

  get data() {
    const requestBody = this.ctx.request.all();
    const id = this.ctx.params.id;
    const referenceId = this.ctx.params.referenceId;

    return Object.assign({}, requestBody, { companyId: id, companyTypeReassureId: referenceId });
  }

  get messages() {
    return {
      'companyId.required': 'You must pass a company',
      'companyId.integer': 'The company reference must be a valid number',
      'companyId.existsFd': 'The company passed does not exists',

      'companyTypeReassureId.required': 'You must pass your followup reference',
      'companyTypeReassureId.integer': 'The followup reference must exist',
      'companyTypeReassureId.existsFd': 'The followup reference does not exist',
    };
  }

  async fails(errorMessages) {
    return this.ctx.response.status(400).send(errorMessages);
  }
}

module.exports = GetTypeReassureInformation;
