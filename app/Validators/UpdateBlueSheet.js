'use strict'


const BaseValidator = use('./BaseValidator');

class UpdateBlueSheet extends BaseValidator  {
  get rules () {
    return {
      //validation rules blueSheet
      'reason_leaving':'required|string',
      'achievement_one':'required|string|max:1024',
      'achievement_two':'required|string|max:1024',
      'achievement_three':'required|string|max:1024',
      'experience':'required|string',
      'time_looking':'required|string',
      'minimum_salary':'required|number|range:1,9007199254740991',
      'good_salary':'required|number|range:1,9007199254740991',
      'no_brainer_salary':'required|number|range:1,9007199254740991',
      'interview_dates': 'arrayOfDates',
      'time_start_type_id': 'required|integer',
      'candidate_type_id': 'required|integer',
      'work_type_option_id': 'required|integer',
    }
  }

  get messages(){
    return {
      'reason_leaving.required':'You must provide a reason for leaving',
      'achievement_one.required':'You must provide the first achievement',
      'achievement_two.required':'You must provide the second achievement',

      'achievement_one.max': 'Achievement must not exceed 1024 characers',
      'achievement_two.max': 'Achievement must not exceed 1024 characers',
      'achievement_three.max': 'Achievement must not exceed 1024 characers',

      'achievement_three.required':'You must provide the third achievement',
      'experience.required':'You must provide a experience',
      'time_looking.required':'You must provide a time_looking',
      'minimum_salary.required':'You must provide a minimum salary',
      'good_salary.required':'You must provide a good salary',
      'no_brainer_salary.required':'You must provide a no brainer salary' ,
      'time_start_type_id.required': 'You must provide a time to start',
      'candidate_type_id.required': 'You must provide a candidate type',
      'work_type_option_id.required': 'You must provide a work type',
      'work_type_option_id.integer': 'You must provide a valid work type',
    }
  }
}

module.exports = UpdateBlueSheet
