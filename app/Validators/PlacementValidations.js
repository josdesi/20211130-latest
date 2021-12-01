'use strict'

const Antl = use('Antl');
const { rule } = require('indicative');
const { FeeAgreementPaymentSchemes, EntityTypes } = use('App/Helpers/Globals');

const validPaymentSchemes = Object.values(FeeAgreementPaymentSchemes);
const paymentSchemesWithoutFlatFlee = validPaymentSchemes.filter(
  (scheme) => scheme !== FeeAgreementPaymentSchemes.Flat
);
const validEntities = [EntityTypes.Candidate, EntityTypes.JobOrder, EntityTypes.Placement.default, EntityTypes.Company, EntityTypes.FeeAgreement];
const validSplitTypes = [EntityTypes.Candidate, EntityTypes.Company];

module.exports = {
  //Placement
  fee_data: {
    validations:{
        fee_agreement_payment_scheme_id: `required|in:${validPaymentSchemes}`,
        fee_amount: `required_when:fee_agreement_payment_scheme_id,${FeeAgreementPaymentSchemes.Flat}|number`,
        service_months: `integer`,
        fee_percentage: [
          rule('number'),
          ...paymentSchemesWithoutFlatFlee.map((scheme) =>
            rule('required_when', ['fee_agreement_payment_scheme_id', scheme])
          ),
        ],
        first_year_value: [
          rule('number'),
          ...paymentSchemesWithoutFlatFlee.map((scheme) =>
            rule('required_when', ['fee_agreement_payment_scheme_id', scheme])
          ),
        ],
        start_date: [rule('required'), rule('dateFormat', 'YYYY-MM-DDTHH:mm:ss.SSSZ')], 
        guarantee_days: `required|integer`,
        company_fee_agreement_id: 'integer|existsFd:company_fee_agreements,id',
        monthly_amount: 'number'
    },
    messages: {
      'fee_agreement_payment_scheme_id.in': Antl.formatMessage('messages.validation.invalid.single', {
        field: 'fee agreement payment scheme',
      }),
      'fee_agreement_payment_scheme_id.required': Antl.formatMessage('messages.validation.required', {
        field: 'fee agreement payment scheme',
      }),
      'fee_amount.required_when': Antl.formatMessage('messages.validation.required', { field: 'fee amount' }),
      'fee_amount.number': Antl.formatMessage('messages.validation.type', { field: 'fee amount', type: 'number' }),
      'service_months.integer': Antl.formatMessage('messages.validation.type', {
        field: 'service months',
        type: 'number',
      }),
      'fee_percentage.required_when': Antl.formatMessage('messages.validation.required', { field: 'fee percent' }),
      'fee_percentage.number': Antl.formatMessage('messages.validation.type', { field: 'fee percent', type: 'number' }),
      'first_year_value.required_when': Antl.formatMessage('messages.validation.required', { field: 'first Year' }),
      'first_year_value.number': Antl.formatMessage('messages.validation.type', { field: 'first year', type: 'number' }),
      'start_date.required': Antl.formatMessage('messages.validation.required', { field: 'candidate start date' }),
      'start_date.dateFormat': Antl.formatMessage('messages.validation.format', {
        field: 'candidate start date',
        format: 'YYYY-MM-DDTHH:mm:ss.SSSZ',
      }),
      'guarantee_days.required': Antl.formatMessage('messages.validation.required', {
        field: 'guarantee_days',
      }),
      'guarantee_days.integer': Antl.formatMessage('messages.validation.type', { field: 'guarantee_days', type: 'number' }),
      'company_fee_agreement_id.integer': Antl.formatMessage('messages.validation.type', {
        field: 'fee agreement key',
        type: 'number',
      }),
      'company_fee_agreement_id.existsFd': Antl.formatMessage('messages.validation.notExist', { entity: 'fee agreement' }),
      'monthly_amount.number': Antl.formatMessage('messages.validation.type', { field: 'monthly amount', type: 'number' }),
    }
  },
  //Sendout
  sendout:{
    validations:{
      sendout_id: 'required|integer|existsFd:sendouts,id'
    },
    messages:{
      'sendout_id.required': Antl.formatMessage('messages.validation.required', { field: 'sendout reference' }),
      'sendout_id.integer': Antl.formatMessage('messages.validation.type', {
        field: 'sendout reference',
        type: 'number',
      }),
      'sendout_id.existsFd': Antl.formatMessage('messages.validation.notExist', { entity: 'sendout' })
    }
  },
  //Split
  splits: {
    validations:{
      splits: 'required|array',
      'splits.*.type': `required|string|in:${validSplitTypes}`,
      'splits.*.user_id': 'required|integer|existsFd:users,id',
      'splits.*.is_channel_partner': 'required|boolean',
      'splits.*.percent': 'required|number'
    },
    messages:{
      'splits.required': Antl.formatMessage('messages.validation.required', { field: 'splits' }),
      'splits.array': Antl.formatMessage('messages.validation.type', { field: 'splits', type: 'an array' }),
      'splits.*.type.required': Antl.formatMessage('messages.validation.required', { field: 'splits type' }),
      'splits.*.type.string': Antl.formatMessage('messages.validation.type', { field: 'splits type', type: 'string' }),
      'splits.*.type.in': Antl.formatMessage('messages.validation.invalid.multiple', {
        parent: 'splits type',
        field: 'a type',
      }),
      'splits.*.user_id.required': Antl.formatMessage('messages.validation.required', { field: 'splits user' }),
      'splits.*.user_id.integer': Antl.formatMessage('messages.validation.type', {
        field: 'splits user',
        type: 'number',
      }),
      'splits.*.existsFd': Antl.formatMessage('messages.validation.notExist', { entity: 'user' }),
      'splits.*.user_id.is_channel_partner.required': Antl.formatMessage('messages.validation.required', {
        field: 'splits channel partner',
      }),
      'splits.*.is_channel_partner.boolean': Antl.formatMessage('messages.validation.type', {
        field: 'splits channel partner',
        type: 'conditional',
      }),
      'splits.*.percent.required': Antl.formatMessage('messages.validation.required', { field: 'splits percent' }),
      'splits.*.percent.number': Antl.formatMessage('messages.validation.type', {
        field: 'splits percent',
        type: 'number',
      })
    }
  },
  //Attachments
  files: {
    validations:{
      files: 'required|array',
      'files.*.entity': `required|string|in:${validEntities}`,
      'files.*.type_id': `required|integer`,
      'files.*.id': 'required|integer'
    },
    messages:{
      'files.required': Antl.formatMessage('messages.validation.required', { field: 'attachments' }),
      'files.array': Antl.formatMessage('messages.validation.type', { field: 'attachments', type: 'an array' }),
      'files.*.entity.required': Antl.formatMessage('messages.validation.required', { field: 'attachments entity' }),
      'files.*.entity.string': Antl.formatMessage('messages.validation.type', {
        field: 'attachments entity',
        type: 'string',
      }),
      'files.*.entity.in': Antl.formatMessage('messages.validation.invalid.multiple', {
        parent: 'attachments',
        field: 'an entity',
      }),
      'files.*.type_id.required': Antl.formatMessage('messages.validation.required', { field: 'attachments type' }),
      'files.*.type_id.integer': Antl.formatMessage('messages.validation.type', {
        field: 'attachments type',
        type: 'number',
      }),
      'files.*.id.required': Antl.formatMessage('messages.validation.required', { field: 'attachments reference' }),
      'files.*.id.integer': Antl.formatMessage('messages.validation.type', {
        field: 'attachments reference',
        type: 'number',
      })
    }
  },

  sources:{
    validations: {
      source_type_id: 'required',
      job_order_source_type_id: 'required'
    },
    messages: {
      'source_type_id.required': Antl.formatMessage('messages.validation.required', { field: 'candidate source' }),
      'job_order_source_type_id.required': Antl.formatMessage('messages.validation.required', { field: 'job  order source' }),
    }
  },

  customFields: {
    validations: {
      additional_invoice_recipients: 'array',
      payment_details: 'string'
    },
    messages: {
      'additional_invoice_recipients.array': Antl.formatMessage('messages.validation.type', { field: 'additional recipients', type: 'array' }),
      'payment_details.string': Antl.formatMessage('messages.validation.type', { field: 'payment details', type: 'string' })
    }
  }
}
