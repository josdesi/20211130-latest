'use strict'

const BaseValidator = use('./BaseValidator');

class UpdateWhiteSheet  extends BaseValidator {
  get rules() {
    return {
      // validation rules white sheet
      'job_order_type_id':'required|integer',
      'fee_agreement_percent':'number|range:0,100',
      'time_position_open':'required|date',
      'position_filled':'required|date',
      'minimum_compensation':'required|number',
      'good_compensation':'required|number',
      'maximum_compensation':'required|number',
      'background_requirements':'required|string',
      'preset_interview_dates':'arrayOfDates',
      'warranty_time_in_days': 'range:-1,61',
      'notes':'required|string',
      'discussing_agreement_complete':'required|integer',
      'benefits':'required|string',
      'work_type_option_id':'required|integer',
      'company_prepared_to_sign_service_agreement': 'required|integer',
      'company_prepared_to_interview_asap': 'required|integer'
    };
  }

  get messages() {
    return {
      'job_order_type_id.required':'You must provide a job_order_type_id',
      'fee_agreement_percent.required':'You must provide a fee_agreement_percent',
      'fee_agreement_percent.range':'{{field}} must be between {{argument.0}} and {{argument.1}}',
      'time_position_open.required':'You must provide a time_position_open',
      'position_filled.required':'You must provide a position_filled',
      'minimum_compensation.required':'You must provide a minimum_compensation',
      'good_compensation.required':'You must provide a good_compensation' ,
      'maximum_compensation.required':'You must provide a maximum_compensation',
      'background_requirements.required':'You must provide a background_requirements',
      'preset_interview_dates.arrayOfDates': 'You must provide at least on valid interview date',
      'warranty_time_in_days.range': 'Warranty days must be between 30 and 360',
      'work_type_option_id.required':'You must provide a work_type_option_id',
      'work_type_option_id.integer':'You must provide a work_type_option_id',
    };
  }
}

module.exports = UpdateWhiteSheet
