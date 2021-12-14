'use strict';

const { SendoutTypesSchemes } = use('App/Helpers/Globals');

const BaseValidator = use('./BaseValidator');

class StoreSendout extends BaseValidator {
  get rules() {
    return {
      'type_id': 'required|integer',
      'status_id': 'required|integer',
      'candidate_id': 'required|integer|existsFd:candidates,id',
      'job_order_id': 'required|integer|existsFd:job_orders,id',
      'fee_amount': `required_when:type_id,${SendoutTypesSchemes.Sendout}|number`,

      'interviews': 'required_when:interview_schedule,true',
      'interviews.*.interview_type_id': `required_when:type_id,${SendoutTypesSchemes.Sendout}|integer`,
      'interviews.*.interview_date': `required_when:type_id,${SendoutTypesSchemes.Sendout}|date`,
      'interviews.*.interview_time_zone': `required_when:type_id,${SendoutTypesSchemes.Sendout}|string`,

      'attachments': 'required',

      'hiring_authorities': 'required|array',

      'cc_emails': 'arrayOfEmails',
      'bcc_emails': 'required|arrayOfEmails|min:1',
      'template_id': 'required|integer|existsFd:sendout_templates,id',
      'subject': 'required',
      'template': 'required'
    };
  }

  get messages() {
    return {
      'type_id.required': 'The type is required to create a sendout',
      'type_id.integer': 'The type id is not valid',

      'status_id.required': 'The sendout status is required to create a sendout',
      'status_id.integer': 'The sendout status id is not valid',

      'candidate_id.required': 'The candidate is required to create a sendout',
      'candidate_id.integer': 'The candidate id is not valid',
      'candidate_id.existsFd': 'The candidate does not exist in Fortpac',

      'job_order_id.required': 'The job order is required to create a sendout',
      'job_order_id.integer': 'The job order id is not valid',
      'job_order_id.existsFd': 'The job order does not exist in Fortpac',

      'fee_amount.required_when': 'The estimated full fee amount is required to create a sendout',
      'fee_amount.number': 'The estimated full fee amount should be a currency type',

      'interviews.required_when': 'The interview is required to create a sendout',
      'interviews.*.interview_type_id.required_when': 'The interview type is required to create a sendout',
      'interviews.*.interview_type_id.integer': 'The interview type is not valid',
      'interviews.*.interview_date.required_when': 'The interview date is required to create a sendout',
      'interviews.*.interview_date.date': 'The interview date is not valid',
      'interviews.*.interview_time_zone.required_when': 'The interview time zone is required to create a sendout',

      'attachments.required': 'The attachments are required to create a sendout',

      'hiring_authorities.required':'You must provide a hiring authorities emails for the sendout',
      'hiring_authorities.array': 'The hiring authorities emails are not valid',

      'cc_emails.arrayOfEmails': 'You must provide a list of emails',

      'bcc_emails.required': 'The list of emails bcc is required to create a sendout',
      'bcc_emails.arrayOfEmails': 'You must provide a list of emails',
      'bcc_emails.min': 'You must provide at least one bcc email',

      'template_id.required': 'The template is required to create a sendout',
      'template_id.integer': 'The template id is not valid',
      'template_id.existsFd': 'The template not exist on the Fortpac',

      'subject.required': 'The subject is required to create a sendout',
      'template.required': 'The template is required to create a sendout'
    };
  }
}

module.exports = StoreSendout;
