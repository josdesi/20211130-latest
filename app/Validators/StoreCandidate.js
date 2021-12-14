'use strict';

class StoreCandidate {
  get rules() {
    return {
      // validation rules personal_information
      first_name: 'required|max:45|string',
      last_name: 'required|max:45|string',

      //validation rules contact
      phone: 'required|min:10|max:10|integer',
      ext: 'max:16',
      mobile: 'min:10|max:10|integer',
      personal_email: 'max:255|string|uniqueCaseInsensitivePersonalEmail:candidates',

      //validation address
      zip: 'required|max:8|existsFd:zip_codes,zip_ch',
      city_id: 'required|integer|existsFd:cities,id',

      // validation rules candidate
      title: 'required|max:512|string',
      email: 'required|max:255|string|uniqueCaseInsensitive:candidates,email',
      link_profile: 'max:1024|customUrl',
      industry_id: 'integer',
      position_id: 'required|integer',
      status_id: 'required|integer',
      recruiter_id: 'integer',
      source_type_id: 'required|integer',
      specialty_id:'required|integer',
      subspecialty_id:'integer',

      //validation rules files path
      files: 'array',
      'files.*':'integer',

      //Employer Company rules
      company_id: 'integer|existsFd:companies,id',

      //validation rules blueSheet
      'blueSheet':'required',
      'blueSheet.reason_leaving':'required|string',
      'blueSheet.achievement_one':'required|string|max:1024',
      'blueSheet.achievement_two':'required|string|max:1024',
      'blueSheet.achievement_three':'required|string|max:1024',
      'blueSheet.experience':'required|string',
      'blueSheet.time_looking':'required|string',
      'blueSheet.minimum_salary':'required|number|range:1,9007199254740991',
      'blueSheet.good_salary':'required|number|range:1,9007199254740991',
      'blueSheet.no_brainer_salary':'required|number|range:1,9007199254740991',
      'blueSheet.interview_dates':'arrayOfDates',
      'blueSheet.time_start_type_id':'required|integer',
      'blueSheet.candidate_type_id':'required|integer',
      'blueSheet.work_type_option_id':'required|integer',
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
      'personal_email.max': 'The personal email size is too long',

      'zip.required': 'You must provide a zip code',
      'zip.existsFd': 'ZipCode not valid',
      'city_id.required': 'You must provide a city ',
      'city_id.existsFd': 'City not Valid',

      'state_id.required': 'You must provide a state',

      'company_id.required': 'You must provide a company employer',
      'company_id.integer': 'The company provided must be an id reference',
      'company_id.existsFd': 'The company provided does not exist',

      'title.required': 'You must provide a title',
      'email.required': 'You must provide an email',
      'link_profile.customUrl': 'The profile link is not valid',
      'link_profile.max': 'The link profile is too long',
      'industry_id.required': 'You must provide an industry',
      'position_id.required': 'You must provide a functional title',
      'status_id.required': 'You must provide a status',
      'source_type_id': 'The source is not valid',
      'email.uniqueCaseInsensitive': 'A candidate with the provided email already exists',
      'personal_email.uniqueCaseInsensitivePersonalEmail': 'A candidate with the provided other email already exists',

      'blueSheet.required':'You must provide a BlueSheet',
      'blueSheet.reason_leaving.required':'You must provide a reason_leaving',
      'blueSheet.achievement_one.required':'You must provide a achievement_one',
      'blueSheet.experience.required':'You must provide a experience',
      'blueSheet.time_looking.required':'You must provide a time_looking',
      'blueSheet.achievement_two.required': 'You must provide an achievement here',
      'blueSheet.achievement_three.required': 'You must provide an achievement here',

      'blueSheet.achievement_one.max': 'Achievement must not exceed 1024 characers',
      'blueSheet.achievement_two.max': 'Achievement must not exceed 1024 characers',
      'blueSheet.achievement_three.max': 'Achievement must not exceed 1024 characers',

      'blueSheet.minimum_salary.required':'You must provide a minimum salary',
      'blueSheet.good_salary.required':'You must provide a good salary',
      'blueSheet.no_brainer_salary.required':'You must provide a no brainer_salary' ,
      'blueSheet.minimum_salary.range':'You must provide a minimum salary',
      'blueSheet.good_salary.range':'You must provide a good salary',
      'blueSheet.no_brainer_salary.range':'You must provide a no brainer salary' ,
      'blueSheet.time_start_type_id.required': 'You must provide a time to start',
      
      'blueSheet.candidate_type_id.required': 'You must provide a candidate type',
      'blueSheet.work_type_option_id.required': 'You must choose a work type option',
      'blueSheet.work_type_option_id.integer': 'You must choose a work type option',
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

module.exports = StoreCandidate;
