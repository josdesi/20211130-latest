'use strict';

const BaseValidator = use('./BaseValidator');

class Position extends BaseValidator {
  get rules() {
    return {
      // validation rules
      title: 'required|string',
      industry_id: 'required|integer'
    };
  }

  get messages() {
    return {
      'title.required': 'Position title is required',
      'industry_id.required': 'Industry ID is required',
      'industry_id.integer': 'Industry ID must be an integer'
    };
  }
}

module.exports = Position;
