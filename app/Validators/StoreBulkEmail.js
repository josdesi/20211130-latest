'use strict';

const { BulkEmailScopeTypes } = use('App/Helpers/Globals');
const Antl = use('Antl');

const requiredAtLeastOne = [
  'search_project_id',
  'block_resend',
  'subject',
  'text',
  'html',
  'bulk_email_scope_type_id ',
];
const withOutAll = (exclude) => {
  return requiredAtLeastOne.filter((row) => row !== exclude).join();
};

const withOutAllMessage = Antl.formatMessage('messages.validation.withOutAll', {
  action: 'store',
  entity: 'draft',
});

class StoreBulkEmail {
  get rules() {
    return {
      is_draft: 'required|boolean',
      search_project_id: `required_when:is_draft,false|required_without_all:${withOutAll('search_project_id')}|integer|existsFd:search_projects,id`,
      block_resend: `required_when:is_draft,false|required_without_all:${withOutAll('block_resend')}|boolean`,
      subject: `required_when:is_draft,false|required_without_all:${withOutAll('subject')}|max:254|string`,
      text: `required_when:is_draft,false|required_without_all:${withOutAll('text')}|string`,
      html: `required_when:is_draft,false|required_without_all:${withOutAll('html')}|string`,
      files: 'array',
      draft_id: 'integer|existsFd:email_histories,id',
      bulk_email_scope_type_id: `required_when:is_draft,false|required_without_all:${withOutAll('bulk_email_scope_type_id')}|integer|existsFd:bulk_email_scope_types,id`,
      candidate_ids: `array|required_when:bulk_email_scope_type_id,${BulkEmailScopeTypes.Marketing}`,
      'candidate_ids.*': 'integer|existsFd:candidates,id',
      job_order_ids: `array|required_when:bulk_email_scope_type_id,${BulkEmailScopeTypes.Recruiting}`,
      'job_order_ids.*': 'integer|existsFd:job_orders,id',
      email_template_id: 'integer|existsFd:email_templates,id|required_when:block_resend,true',
      block_duration_days: 'integer|required_when:block_resend,true',
      attachment_template_block_list: 'array',
      block_similar_companies: 'boolean',
      block_client_companies: 'boolean',
    };
  }

  get messages() {
    return {
      'is_draft.required': 'You must provide if it is a draft.',
      
      'search_project_id.required_when': 'You must provide a search project.',
      'block_resend.required_when': 'You must provide if the block resend rules will work.',
      'subject.required_when': 'You must provide a subject.',
      'text.required_when': 'You must provide a text.',
      'html.required_when': 'You must provide a html.',
      'bulk_email_scope_type_id.required_when': 'You must pass what scope this bulk email will have',
      'block_duration_days.required_when': 'You must specify how many days the block resend will look into the past to apply the rule',
      'candidate_ids.required_when': 'You must pass which candidates you are marketing!',
      'job_order_ids.required_when': 'You must pass which job orders you are using for recruiting!',
      'email_template_id.required_when': 'The template is needed for the block resend',

      'search_project_id.required_without_all': withOutAllMessage,
      'block_resend.required_without_all': withOutAllMessage,
      'subject.required_without_all': withOutAllMessage,
      'text.required_without_all': withOutAllMessage,
      'html.required_without_all': withOutAllMessage,
      'bulk_email_scope_type_id.required_without_all': withOutAllMessage,

      'subject.max': 'The subject size is too long.',

      'bulk_email_scope_type_id.integer': 'The scope must be an id reference',
      'candidate_ids.*.integer': 'The candidate reference must be a number',
      'job_order_ids.*.integer': 'The job order reference must be a number',
      
      'candidate_ids.array': 'The candidates must be an array containing the references',
      'job_order_ids.array': 'The job orders must be an array containing the references',

      'candidate_ids.*.existsFd': 'The candidate does not exist',
      'job_order_ids.*.existsFd': 'The job order does not exist',
      'search_project_id.existsFd': 'The search project provided is not valid',
      'email_template_id.existsFd': 'The email template provided is not valid',
      'draft_id.existsFd': 'The email draft provided is not valid',
      'bulk_email_scope_type_id.existsFd': 'The bulk email scope provided is not valid',

      'block_similar_companies.boolean': 'The block similar companies must be a boolean!',
      'block_client_companies.boolean': 'The block client & signed companies must be a boolean!',
    };
  }

  async fails(errorMessages) {
    return this.ctx.response.status(400).send(errorMessages);
  }
}

module.exports = StoreBulkEmail;
