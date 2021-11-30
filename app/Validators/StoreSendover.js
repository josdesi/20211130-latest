'use strict';

const BaseValidator = use('./BaseValidator');

class StoreSendover extends BaseValidator {
  get rules() {
    return {
      'type_id': 'required|integer',
      'status_id': 'required|integer',
      'candidate_id': 'required|integer|existsFd:candidates,id',
      'job_order_id': 'required|integer|existsFd:job_orders,id',

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
      'type_id.required': 'The type is required to create a sendover',
      'type_id.integer': 'The type id is not valid',

      'status_id.required': 'The sendover status is required to create a sendover',
      'status_id.integer': 'The sendover status id is not valid',

      'candidate_id.required': 'The candidate is required to create a sendover',
      'candidate_id.integer': 'The candidate id is not valid',
      'candidate_id.existsFd': 'The candidate does not exist in Fortpac',

      'job_order_id.required': 'The job order is required to create a sendover',
      'job_order_id.integer': 'The job order id is not valid',
      'job_order_id.existsFd': 'The job order does not exist in Fortpac',

      'attachments.required': 'The attachments are required to create a sendover',

      'hiring_authorities.required':'You must provide a hiring authorities emails for the sendover',
      'hiring_authorities.array': 'The hiring authorities emails are not valid',

      'cc_emails.arrayOfEmails': 'You must provide a list of emails',

      'bcc_emails.required': 'The list of emails bcc is required to create a sendover',
      'bcc_emails.arrayOfEmails': 'You must provide a list of emails',
      'bcc_emails.min': 'You must provide at least one bcc email',

      'template_id.required': 'The template is required to create a sendover',
      'template_id.integer': 'The template id is not valid',
      'template_id.existsFd': 'The template not exist on the Fortpac',

      'subject.required': 'The subject is required to create a sendover',
      'template.required': 'The template is required to create a sendover'
    };
  }
}

module.exports = StoreSendover;
