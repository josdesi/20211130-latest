'use strict'

const BaseValidator = use('./BaseValidator');

class StoreNote extends BaseValidator {

  get sanitizationRules () {
    return {
      body: 'stripHtmlTags',
    }
  }
  
  get rules() {
    return {
      body: 'required|string',
      title: 'required|string',
    };
  }

  get messages() {
    return {
      'body.required': 'The body of the note is required',
      'title.required': 'The title of the note is required'
    };
  }
}

module.exports = StoreNote
