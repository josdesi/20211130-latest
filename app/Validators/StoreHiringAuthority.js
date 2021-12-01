'use strict';

class HiringAuthority {
  get rules() {
    return {
      // validation rules hiring authority
      specialty_id: 'required|integer',
      subspecialty_id: 'integer',
      position_id: 'required|integer',
      first_name: 'required|string|max:128',
      last_name: 'required|string|max:128',
      title: 'required|string|max:512',
      personal_email: 'email|max:255|uniqueCaseInsensitive:hiring_authorities,personal_email',
      personal_phone: 'integer|min:10|max:10',
      work_email: 'required|email|max:255|uniqueCaseInsensitive:hiring_authorities,work_email',
      work_phone: 'required|integer|min:10|max:10',
      ext: 'max:16',
      other_ext: 'max:16',
      nameId:'integer',
      isContact:'boolean'
    };
  }

  get messages() {
    return {
      'subspecialty_id.integer': 'subspecialty_id must be an integer',
      'specialty_id.required': 'specialty_id is required',
      'position.required': 'position_id is required',
      'first_name.required': 'Firts name is required',
      'last_name.required': 'Last name is required',
      'title.required': 'Title is required',
      'first_name.max': '{{field}} must have at most {{argument.0}} characters',
      'last_name.max': '{{field}} must have at most {{argument.0}} characters',
      'title.max': '{{field}} must have at most {{argument.0}} characters',
      'personal_email.required': 'Hiring authority email is required',
      'personal_email.email': 'Please enter a valid email address',
      'personal_email.uniqueCaseInsensitive': 'A hiring authority with this email already exists',
      'personal_phone.required': 'Hiring authority phone is required',
      'personal_phone.integer': 'Only integers are allowed as phone hiring authority number',
      'personal_phone.min': '{{field}} must have {{argument.0}} digits',
      'personal_phone.max': '{{field}} must have {{argument.0}} digits',
      'work_email.required': 'Hiring authority work email is required',
      'work_email.email': 'Please enter a valid work email address',
      'work_email.uniqueCaseInsensitive': 'A hiring authority with this work email already exists',
      'work_phone.required': 'Hiring authority work phone is required',
      'ext.max': '{{field}} must have at most {{argument.0}} characters',
      'other_ext.max': '{{field}} must have at most {{argument.0}} characters',
      'work_phone.integer': 'Only integers are allowed as work phone hiring authority number',
      'work_phone.min': '{{field}} must have {{argument.0}} digits',
      'work_phone.max': '{{field}} must have {{argument.0}} digits'
    };
  }

  async fails(errorMessages) {
    return this.ctx.response.status(400).send(errorMessages);
  }
}

module.exports = HiringAuthority;
