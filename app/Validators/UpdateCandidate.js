'use strict';
class UpdateCandidate {
  get rules() {
    const candidateId = this.ctx.params.id

    return {
      
      // validation rules personal_information
      first_name: 'required|max:45|string',
      last_name: 'required|max:45|string',

      //validation rules contact
      phone: 'required|max:10|min:10|integer',
      mobile: 'max:10|min:10|integer',
      personal_email: 'email',
      ext: 'max:16',

      //validation address
      zip: 'required|max:8|existsFd:zip_codes,zip_ch',
      city_id: 'required|integer|existsFd:cities,id',
      state_id: 'required|integer',

      //Employer Company rules
      company_id: 'integer|existsFd:companies,id',

      // validation rules candidate
      title: 'required|max:512|string',
      email: `required|max:254|string|uniqueCaseInsensitive:candidates,email,id,${candidateId}`,
      link_profile: 'max:1024|string',
      source_type_id: 'required_if:link_profile|integer',
      industry_id: 'integer',
      position_id: 'required|integer',
      specialty_id:'required|integer',
      subspecialty_id:'integer',

    };
  }

  get messages() {
    return {
      'first_name.required': 'You must provide a first name.',
      'last_name.required': 'You must provide a last name.',
      'first_name.max': 'The first name size is too long.',
      'last_name.max': 'The last name size is too.',
      'phone.min': '{{field}} must have {{argument.0}} digits',
      'mobile.min': '{{field}} must have {{argument.0}} digits',
      'ext.max': '{{field}} must have at most {{argument.0}} characters',
      'phone.max': '{{field}} must have {{argument.0}} digits',
      'mobile.max': '{{field}} must have {{argument.0}} digits',   
      'email.uniqueCaseInsensitive': 'A candidate with the provided email already exists',
      'personal_email.uniqueCaseInsensitivePersonalEmail': 'A candidate with the provided other email already exists',
      
      'zip.required': 'You must provide a zip code',
      'zip.existsFd': 'ZipCode not valid',
      'city_id.required': 'You must provide a city_id',
      'city_id.existsFd': 'City not Valid',
      'state_id.required': 'You must provide an state_id',

      'company_id.integer': 'The company provided must be an id reference',
      'company_id.existsFd': 'The company provided does not exist',

      'title.required': 'You must provide a title',
      'link_profile.max': 'Thelink profile is too long',
      'salary_expectation.required': 'You must provide a salry expectation',
      'position_id.required': 'You must provide a position_id',
      'source_type_id.required_if': 'You must provide a source_type_id',
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

module.exports = UpdateCandidate;
