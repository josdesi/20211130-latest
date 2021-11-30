'use strict'

const BaseValidator = use('./BaseValidator');

class StoreActivityLog extends BaseValidator {
  
  get sanitizationRules () {
    return {
      body: 'stripHtmlTags',
    }
  }

  get rules() {
    return {
      body: 'required|string',
      activity_log_type_id:'required|integer'
    };
  }

  get messages() {
    return {
      'body.required': 'The body of the activity is required',
      'activity_log_type_id.required':'The activity type is required'
    };
  }
}

module.exports = StoreActivityLog
