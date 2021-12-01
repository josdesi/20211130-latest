'use strict';
const { BulkEmailScopeTypes } = use('App/Helpers/Globals');

class StoreScheduledBulkEmail {
  get rules() {
    return {
      search_project_id: 'required|integer|existsFd:search_projects,id',
      block_resend: 'required|boolean',
      subject: 'required|max:254|string',
      text: 'required|string',
      html: 'required|string',
      files: 'array',
      'files.*': 'integer',

      draft_id: 'integer|existsFd:email_histories,id',
      email_template_id: 'integer|existsFd:email_templates,id',
      block_duration_days: 'integer|required_when:block_resend,true',
      send_date: 'required|date',

      bulk_email_scope_type_id: 'required|integer|existsFd:bulk_email_scope_types,id',
      candidate_ids: `array|required_when:bulk_email_scope_type_id,${BulkEmailScopeTypes.Marketing}`,
      'candidate_ids.*': 'integer|existsFd:candidates,id',
      job_order_ids: `array|required_when:bulk_email_scope_type_id,${BulkEmailScopeTypes.Recruiting}`,
      'job_order_ids.*': 'integer|existsFd:job_orders,id',
      attachment_template_block_list: 'array',
      block_similar_companies: 'boolean',
    };
  }

  get messages() {
    return {
      'search_project_id.required': 'You must provide a search project.',
      'block_resend.required': 'You must provide if it has blocked the resend.',
      'send_date.required': 'You must provide the date when the scheduled email is going to be sent.',
      'subject.required': 'You must provide a subject.',
      'text.required': 'You must provide a text.',
      'html.required': 'You must provide a html.',

      'subject.max': 'The subject size is too long.',

      'block_duration_days.required_when': 'You must specify how many days the block resend will look into the past to apply the rule',

      'search_project_id.existsFd': 'The search project provided is not valid',
      'email_template_id.existsFd': 'The email template provided is not valid',
      'draft_id.existsFd': 'The email draft provided is not valid',

      'bulk_email_scope_type_id.required': 'You must pass what scope this bulk email will have',
      'bulk_email_scope_type_id.integer': 'The scope must be an id reference',
      'bulk_email_scope_type_id.existsFd': 'The bulk email scope provided is not valid',

      'candidate_ids.array': 'The candidates must be an array containing the references',
      'candidate_ids.required_when': 'You must pass which candidates you are marketing!',

      'candidate_ids.*.existsFd': 'The candidate does not exist',
      'candidate_ids.*.integer': 'The candidate reference must be a number',

      'job_order_ids.array': 'The job orders must be an array containing the references',
      'job_order_ids.required_when': 'You must pass which job orders you are using for recruiting!',

      'job_order_ids.*.existsFd': 'The job order does not exist',
      'job_order_ids.*.integer': 'The job order reference must be a number',

      // 'block_similar_companies.required': 'You must pass if we should block or not similar companies!', //Needs to check frontend
      'block_similar_companies.boolean': 'The block similar companies must be a boolean!',
    };
  }

  async fails(errorMessages) {
    return this.ctx.response.status(400).send(errorMessages);
  }
}

module.exports = StoreScheduledBulkEmail;
