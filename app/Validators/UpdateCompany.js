'use strict';

class UpdateCompany {
  get rules() {
    return {
      // validation rules company
      name: 'required|string|max:512',
      industry_id: 'integer',
      city_id: 'required|integer|existsFd:cities,id',
      zip: 'required|max:8|existsFd:zip_codes,zip_ch',
      phone: 'required|integer|min:10|max:10',
      ext: 'max:16',
      email: `max:254|string`,
      website:'max:1024|customUrl',
      link_profile: 'max:1024|customUrl',
      specialty_id:'required|integer',
      subspecialty_id:'integer',
    };
  }

  get messages() {
    return {
      'name.max': '{{field}} must have at most {{argument.0}} characters',
      'name.required': 'Company name is required',
      'ext.max': '{{field}} must have at most {{argument.0}} characters',
      'industry_id.required': 'Industry is required',
      'city_id.required': 'City is required',
      'city_id.existsFd': 'The city is not Valid',
      'zip.required': 'The Zip Code is required',
      'zip.existsFd': 'The Zip Code is not valid',

      'phone.required': 'Company phone is required',
      'phone.integer': 'Only integers are allowed as phone company number',
      'phone.min': '{{field}} must have {{argument.0}} digits',
      'phone.max': '{{field}} must have {{argument.0}} digits',
      'email.required': 'Company email is required'
    };
  }

  async fails(errorMessages) {
    return this.ctx.response.status(400).send(errorMessages);
  }

  get sanitizationRules () {
    return {
      email: 'lower_case'
    }
  }
}

module.exports = UpdateCompany;
