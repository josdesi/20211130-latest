'use strict';

const { BulkEmailScopeTypes } = use('App/Helpers/Globals');
const { required, requiredIf, type, exists, withOutAll, max } = use('App/Helpers/AntlBuilder');

const requiredAtLeastOne = [
  'search_project_id',
  'block_resend',
  'subject',
  'text',
  'html',
  'bulk_email_scope_type_id ',
];
const withOutAllRule = (exclude) => {
  return requiredAtLeastOne.filter((row) => row !== exclude).join();
};

class StoreBulkEmail {
  get rules() {
    return {
      is_draft: 'required|boolean',
      search_project_id: `required_when:is_draft,false|required_without_all:${withOutAllRule(
        'search_project_id'
      )}|integer|existsFd:search_projects,id`,
      block_resend: `required_when:is_draft,false|required_without_all:${withOutAllRule('block_resend')}|boolean`,
      subject: `required_when:is_draft,false|required_without_all:${withOutAllRule('subject')}|max:254|string`,
      text: `required_when:is_draft,false|required_without_all:${withOutAllRule('text')}|string`,
      html: `required_when:is_draft,false|required_without_all:${withOutAllRule('html')}|string`,
      files: 'array',
      draft_id: 'integer|existsFd:email_histories,id',
      bulk_email_scope_type_id: `required_when:is_draft,false|required_without_all:${withOutAllRule(
        'bulk_email_scope_type_id'
      )}|integer|existsFd:bulk_email_scope_types,id`,
      candidate_ids: `array|required_when:bulk_email_scope_type_id,${BulkEmailScopeTypes.Marketing}`,
      'candidate_ids.*': 'integer|existsFd:candidates,id',
      job_order_ids: `array|required_when:bulk_email_scope_type_id,${BulkEmailScopeTypes.Recruiting}`,
      'job_order_ids.*': 'integer|existsFd:job_orders,id',
      email_template_id: 'integer|existsFd:email_templates,id|required_when:block_resend,true',
      block_duration_days: 'integer|required_when:block_resend,true',
      attachment_template_block_list: 'array',
      block_similar_companies: 'boolean',
      block_client_companies: 'boolean',

      search_params: 'object',
      'search_params.query': 'required_if:search_params|object',
      'search_params.exclude': 'array',
      'search_params.exclude.*': 'object',
      'search_params.exclude.*.id': 'required_if:search_params.exclude|number',
      'search_params.exclude.*.item_search_project_type': 'required_if:search_params.exclude|number',

      search_candidate_ids: 'array',
      'search_candidate_ids.*': 'number',

      search_hiring_authority_ids: 'array',
      'search_hiring_authority_ids.*': 'number',

      search_name_ids: 'array',
      'search_name_ids.*': 'number',
    };
  }

  get messages() {
    return {
      'is_draft.required': 'You must provide if it is a draft.',

      'search_project_id.required_when': required('search project'),
      'block_resend.required_when': required('block resend'),
      'subject.required_when': required('subject'),
      'text.required_when': required('text body'),
      'html.required_when': required('html body'),
      'bulk_email_scope_type_id.required_when': required('bulk email type'),
      'block_duration_days.required_when': requiredIf('block resend days', 'block resend is on'),
      'candidate_ids.required_when': requiredIf('candidates to market', 'marketing is the bulk type'),
      'job_order_ids.required_when': requiredIf('job order', 'recruiting is the bulk type'),
      'email_template_id.required_when': requiredIf('template', 'block resend is on'),

      'search_project_id.required_without_all': withOutAll('store', 'draft'),
      'block_resend.required_without_all': withOutAll('store', 'draft'),
      'subject.required_without_all': withOutAll('store', 'draft'),
      'text.required_without_all': withOutAll('store', 'draft'),
      'html.required_without_all': withOutAll('store', 'draft'),
      'bulk_email_scope_type_id.required_without_all': withOutAll('store', 'draft'),

      'subject.max': max('subject', '254'),

      'bulk_email_scope_type_id.integer': type('bulk type', 'integer'),
      'candidate_ids.*.integer': type('candidate reference', 'integer'),
      'job_order_ids.*.integer': type('job order reference', 'integer'),

      'candidate_ids.array': type('candidates', 'array'),
      'job_order_ids.array': type('job orders', 'array'),

      'candidate_ids.*.existsFd': exists('candidate'),
      'job_order_ids.*.existsFd': exists('job order'),
      'search_project_id.existsFd': exists('search project'),
      'email_template_id.existsFd': exists('email template'),
      'draft_id.existsFd': exists('draft'),
      'bulk_email_scope_type_id.existsFd': exists('bulk email type'),

      'block_similar_companies.boolean': type('block similar companies', 'boolean'),
      'block_client_companies.boolean': type('block client companies', 'boolean'),

      'search_params.query.required_if': requiredIf('search params', 'the search params are passed'),
      'search_params.query.object': type('search query', 'object'),
      'search_params.exclude.array': type('search exclude', 'array'),
      'search_params.exclude.*.object': type('search exclude object', 'object'),
      'search_params.exclude.*.id.number': type('search exclude object id', 'number'),
      'search_params.exclude.*.id.required_if': requiredIf(
        'search exclude object id',
        'an exclude array row is passed'
      ),
      'search_params.exclude.*.item_search_project_type.number': type('search exclude object type', 'number'),
      'search_params.exclude.*.item_search_project_type.required_if': requiredIf(
        'search exclude object type id',
        'an exclude array row is passed'
      ),

      'search_candidate_ids.array': type('search project candidate references', 'array'),
      'search_candidate_ids.*.number': type('search project candidates reference', 'number'),

      'search_hiring_authority_ids.array': type('search project hiring authority references', 'array'),
      'search_hiring_authority_ids.*.number': type('search project hiring authorities reference', 'number'),

      'search_name_ids.array': type('search project name references', 'array'),
      'search_name_ids.*.number': type('search project names reference', 'number'),
    };
  }

  async fails(errorMessages) {
    return this.ctx.response.status(400).send(errorMessages);
  }
}

module.exports = StoreBulkEmail;
