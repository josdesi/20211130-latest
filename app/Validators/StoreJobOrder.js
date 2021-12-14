'use strict';
const Antl = use('Antl');
const requiredValidationPath = 'messages.validation.required';
class StoreJobOrder {
  get rules() {
    return {
      // validation rules company
      company_id: 'required|integer',
      industry_id: 'integer',
      position_id: 'required|integer',
      title: 'required|string',
      specialty_id: 'required|integer',
      subspecialty_id: 'integer',
      source: 'max:1024|customUrl',
      job_order_source_type_id: 'required|integer',

      // validation rules hiring authority
      hiring_authority_id: 'required|integer',

      //validation address
      zip: 'max:8|existsFd:zip_codes,zip_ch',
      different_location: 'required|integer',
      city_id: 'required_when,different_location,1|integer|existsFd:cities,id',
      //dates
      start_date: 'date',

      //validation rules files path
      files: 'array',
      'files.*': 'integer',

      // validation rules white sheet
      whiteSheet: 'required',
      'whiteSheet.job_order_type_id': 'required|integer',
      'whiteSheet.fee_agreement_percent': 'number|range:0,100',
      'whiteSheet.time_position_open': 'required|date',
      'whiteSheet.position_filled': 'required|date',
      'whiteSheet.minimum_compensation': 'required|number',
      'whiteSheet.good_compensation': 'required|number',
      'whiteSheet.maximum_compensation': 'required|number',
      'whiteSheet.background_requirements': 'required|string',
      'whiteSheet.preset_interview_dates': 'arrayOfDates',
      'whiteSheet.warranty_time_in_days': 'range:-1,61',
      'whiteSheet.notes': 'required|string',
      'whiteSheet.discussing_agreement_complete': 'required|integer',
      'whiteSheet.benefits': 'required|string',
      'whiteSheet.work_type_option_id': 'required|integer',
      'whiteSheet.company_prepared_to_sign_service_agreement': 'required|integer',
      'whiteSheet.company_prepared_to_interview_asap': 'required|integer',
    };
  }

  get messages() {
    return {
      'company_id.required': Antl.formatMessage(requiredValidationPath, {
        field: 'company',
      }),
      'industry_id.required': Antl.formatMessage(requiredValidationPath, {
        field: 'industry',
      }),
      'position_id.required': Antl.formatMessage(requiredValidationPath, {
        field: 'position',
      }),
      'title.required': Antl.formatMessage(requiredValidationPath, {
        field: 'title',
      }),
      'hiring_authority_id.required': Antl.formatMessage(requiredValidationPath, {
        field: 'hiring authority',
      }),
      'job_order_source_type_id.required': Antl.formatMessage(requiredValidationPath, {
        field: 'job source type',
      }),
      'zip.existsFd': Antl.formatMessage('messages.validation.notExist', { entity: 'zip code' }),
      'city_id.existsFd': Antl.formatMessage('messages.validation.notExist', { entity: 'city' }),

      'whiteSheet.required': Antl.formatMessage(requiredValidationPath, {
        field: 'whiteSheet',
      }),
      'whiteSheet.job_order_type_id.required': Antl.formatMessage(requiredValidationPath, {
        field: 'job order type',
      }),
      'whiteSheet.fee_agreement_percent.required': Antl.formatMessage(requiredValidationPath, {
        field: 'fee agreement percent',
      }),

      'whiteSheet.fee_agreement_percent.range': Antl.formatMessage('messages.validation.range', {
        field: 'fee agreement percent',
        lowerRange: '{{argument.0}}',
        highRange: '{{argument.1}}',
      }),

      'whiteSheet.time_position_open.required': Antl.formatMessage(requiredValidationPath, {
        field: 'time position open',
      }),
      'whiteSheet.position_filled.required': Antl.formatMessage(requiredValidationPath, {
        field: 'position filled',
      }),
      'whiteSheet.minimum_compensation.required': Antl.formatMessage(requiredValidationPath, {
        field: 'minimum compensation',
      }),
      'whiteSheet.good_compensation.required': Antl.formatMessage(requiredValidationPath, {
        field: 'good compensation',
      }),
      'whiteSheet.maximum_compensation.required': Antl.formatMessage(requiredValidationPath, {
        field: 'maximum compensation',
      }),
      'whiteSheet.background_requirements.required': Antl.formatMessage(requiredValidationPath, {
        field: 'background requirements',
      }),
      'whiteSheet.warranty_time_in_days.range': Antl.formatMessage('messages.validation.range', {
        field: 'warranty days',
        lowerRange: '30',
        highRange: '360',
      }),
      'whiteSheet.work_type_option_id.required': Antl.formatMessage(requiredValidationPath, {
        field: 'work type option',
      }),
    };
  }

  async fails(errorMessages) {
    return this.ctx.response.status(400).send(errorMessages);
  }
}

module.exports = StoreJobOrder;
