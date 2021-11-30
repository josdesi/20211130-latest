'use strict';
const { companyType } = use('App/Helpers/Globals');

class StoreTypeReassureOpsVerification {
  get rules() {
    return {
      company_id: 'required|integer|existsFd:companies,id',
      company_type_reassure_id: 'required|integer|existsFd:company_type_reassures,id',
      company_type_id: 'required|integer|existsFd:company_types,id',
      file_id: `required_when:company_type_id,${companyType.Vendor}|required_when:company_type_id,${companyType.Client}|integer|existsFd:user_has_temp_files,id`,
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

      'company_type_reassure_id.required': 'You must pass your followup reference',
      'company_type_reassure_id.integer': 'The followup reference must exist',
      'company_type_reassure_id.existsFd': 'The followup reference does not exist',

      'file_id.integer': 'The file reference must be a valid number',
      'file_id.existsFd': 'The file passed does not exists',
      'file_id.required_when': 'You must pass an attachment',

      'company_type_id.required': 'You must pass a company type',
      'company_type_id.integer': 'The company type reference must be a valid number',
      'company_type_id.existsFd': 'The company type passed does not exists',
    };
  }

  async fails(errorMessages) {
    return this.ctx.response.status(400).send(errorMessages);
  }
}

module.exports = StoreTypeReassureOpsVerification;
