'use strict';

class StoreCompany {
  get rules() {
    return {
      // validation rules company
      name: 'required|string|max:512',
      industry_id: 'integer',
      city_id: 'required|integer|existsFd:cities,id',
      zip: 'required|max:8|existsFd:zip_codes,zip_ch',
      phone: 'required|integer|min:10|max:10',
      ext: 'max:16',
      email: 'email|max:254',
      specialty_id:'required|integer',
      subspecialty_id:'integer',

      // validation rules hiring authorities
      // 'hiringAuthorities':'required',
      'hiringAuthorities.*.first_name': 'required|string',
      'hiringAuthorities.*.last_name': 'required|string',
      'hiringAuthorities.*.title': 'required|string',
      'hiringAuthorities.*.personal_email': 'email|max:255|uniqueIfCaseInsensitive:hiring_authorities,personal_email,id',
      'hiringAuthorities.*.personal_phone': 'integer|min:10|max:10',
      'hiringAuthorities.*.work_email': 'required|email|max:255|uniqueIfCaseInsensitive:hiring_authorities,work_email,id',
      'hiringAuthorities.*.work_phone': 'required|integer|min:10|max:10',
      'hiringAuthorities.*.isContact': 'boolean',
      'link_profile': 'customUrl',
      'website': 'customUrl',

      // validation rules file
      fileId: 'integer',

      // The company's employees
      candidate_ids: 'array',
      'candidate_ids.*': 'integer',

      name_ids: 'array',
      'name_ids.*': 'integer',

      //Validation rules fee agreement
      'feeAgreement.fee_percentage':'required_if:feeAgreement|number',
      'feeAgreement.guarantee_days':'required_if:feeAgreement|number',
      'feeAgreement.fee_percentage_change_requested':'required_if:feeAgreement|boolean',
      'feeAgreement.guarantee_days_change_requested':'required_if:feeAgreement|boolean',
      'feeAgreement.verbiage_changes_requested':'required_if:feeAgreement|boolean',
      'feeAgreement.notes':'string',
      'feeAgreement.cc_emails':'arrayOfEmails|max:2',

      'feeAgreement.subject': 'max:255',
    };
  }

  get messages() {
    return {
      'name.max': '{{field}} must have at most {{argument.0}} characters',
      'name.required': 'Company name is required',
      'industry_id.required': 'Industry is required',
      'city_id.required': 'City is required',
      'city_id.existsFd': 'City not Valid',
      'zip.required': 'Zip is required',
      'zip.existsFd': 'ZipCode not valid',
      'phone.required': 'Company phone is required',
      'phone.integer': 'Only integers are allowed as phone company number',
      'ext.max': '{{field}} must have at most {{argument.0}} characters',
      'phone.min': '{{field}} must have {{argument.0}} digits',
      'phone.max': '{{field}} must have {{argument.0}} digits',
      'email.email': 'Please enter a valid email address',

      // 'hiringAuthorities.required':'You must provide a hiring Authority', //Not anymore
      'hiringAuthorities.*.first_name.required': 'Firts name is required',
      'hiringAuthorities.*.last_name.required': 'Last name is required',
      'hiringAuthorities.*.title.required': 'Title is required',
      'hiringAuthorities.*.personal_email.required': 'Hiring authority email is required',
      'hiringAuthorities.*.personal_email.email': 'Please enter a valid email address',
      'hiringAuthorities.*.personal_email.uniqueIfCaseInsensitive': 'A hiring authority with this email already exists',
      'hiringAuthorities.*.personal_phone.required': 'Hiring authority phone is required',
      'hiringAuthorities.*.personal_phone.integer': 'Only integers are allowed as phone hiring authority number',
      'hiringAuthorities.*.work_email.required': 'Hiring authority work email is required',
      'hiringAuthorities.*.work_email.email': 'Please enter a valid work email address',
      'hiringAuthorities.*.work_email.uniqueIfCaseInsensitive': 'A hiring authority with this work email already exists',
      'hiringAuthorities.*.work_phone.required': 'Hiring authority work phone is required',
      'hiringAuthorities.*.work_phone.integer': 'Only integers are allowed as phone hiring authority number',
      'hiringAuthorities.*.work_phone.min': '{{field}} must have {{argument.0}} digits',
      'hiringAuthorities.*.work_phone.max': '{{field}} must have {{argument.0}} digits',
      'hiringAuthorities.*.personal_phone.min': '{{field}} must have {{argument.0}} digits',
      'hiringAuthorities.*.personal_phone.max': '{{field}} must have {{argument.0}} digits',
      'fileId.required': 'Fee agreement is required',

      'candidate_ids.array': 'The candidate employees should be passed as an array',
      'candidate_ids.*.integer': 'The candidate employee reference must be a integer',

      'name_ids.array': 'The name employees should be passed as an array',
      'name_ids.*.integer': 'The name employee reference must be a integer',

      'feeAgreement.hiring_authority_email':'You must provide a hiring Authority for the fee agreement',
      'feeAgreement.fee_percentage':'You must provide a fee percentage for the fee agreement',
      'feeAgreement.guarantee_days':'You must provide the guarantee days for the fee agreement',
      'feeAgreement.fee_percentage_change_requested':'This field must be a boolean',
      'feeAgreement.guarantee_days_change_requested':'This field must be a boolean',
      'feeAgreement.verbiage_changes_requested':'This field must be a boolean',
      'feeAgreement.cc_emails.max':'You can provide two emails at most',
      'feeAgreement.cc_emails.arrayOfEmails':'This field must be a list of emails',
      'feeAgreement.subject.required': 'You must write a subject',
      //'feeAgreement.subject.max': 'Subject must not be larger 255 characters'
    };
  }

  async fails(errorMessages) {
    return this.ctx.response.status(400).send(errorMessages);
  }

  get sanitizationRules () {
    return {
      email: 'lower_case',
      'hiringAuthorities.*.work_email': 'lower_case',
      'hiringAuthorities.*.personal_email': 'lower_case'
    }
  }
}

module.exports = StoreCompany;
