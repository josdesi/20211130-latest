'use strict'

class UpdateName {
  get rules() {
    const nameId = this.ctx.params.id
    return {
      // validation rules personal_information
      first_name: 'required|max:128|string',
      last_name: 'required|max:128|string',

      //validation rules contact
      phone: 'min:10|max:10|integer',
      ext: 'max:16',
      mobile: 'min:10|max:10|integer',

      //validation address
      zip: 'max:8|existsFd:zip_codes,zip_ch',
      city_id: 'integer|existsFd:cities,id',

      //Employer Company rules
      company_id: 'integer|existsFd:companies,id',

      // validation rules candidate
      title: 'max:512|string',
      email: `max:255|string|uniqueCaseInsensitive:names,email,id,${nameId}`,
      personal_email: `email|uniqueCaseInsensitivePersonalEmail:names,${nameId}`,
      link_profile: `max:1024|customUrl|unique:names,link_profile,id,${nameId}`,
      position_id: 'integer|existsFd:positions,id',
      source_type_id: 'integer',
      current_company: 'max:512|string',
      specialty_id: 'required|integer|existsFd:specialties,id',
      subspecialty_id: 'integer|existsFd:subspecialties,id',
      name_status_id: 'integer|existsFd:name_statuses,id'
    };
  }

  get messages() {
    return {
      'first_name.required': 'You must provide a first name.',
      'last_name.required': 'You must provide a last name.',
      'first_name.max': 'The first name size is too long.',
      'last_name.max': 'The last name size is too long.',

      'phone.min': '{{field}} must have {{argument.0}} digits',
      'mobile.min': '{{field}} must have {{argument.0}} digits',
      'ext.max': '{{field}} must have at most {{argument.0}} characters',
      'phone.max': '{{field}} must have {{argument.0}} digits',
      'mobile.max': '{{field}} must have {{argument.0}} digits',

      'zip.existsFd': 'The zip code provided is not valid',
      'city_id.existsFd': 'The city provided is not valid',

      'company_id.integer': 'The company provided must be an id reference',
      'company_id.existsFd': 'The company provided does not exist',

      'email.uniqueCaseInsensitive': 'The email is already registered',
      'personal_email.uniqueCaseInsensitivePersonalEmail': 'Personal email already registered',
      'link_profile.customUrl': 'The profile link is not valid',
      'link_profile.unique': 'This profile link is already registered',
      'link_profile.max': 'The link profile is too long',
      'specialty_id.required': 'You must provide an specialty ',
      'specialty_id.existsFd': 'The specialty provided is not valid',
      'subspecialty_id.existsFd': 'The subspecialty provided is not valid',
      'name_status_id.existsFd': 'The status provided is not valid',
      'position_id.existsFd': 'The functional title provided is not valid',
    };
  }

  async fails(errorMessages) {
    return this.ctx.response.status(400).send(errorMessages);
  }

  get sanitizationRules () {
    return {
      email: 'lower_case',
      personal_email: 'lower_case'
    }
  }
}

module.exports = UpdateName
