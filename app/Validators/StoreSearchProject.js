'use strict';
const Antl = use('Antl');

const requiredAtLeastOne = [
  'candidates',
  'hiring_authorities',
  'names',
  'job_orders',
  'candidate_query',
  'joborder_query',
  'name_query',
  'search_params',
];
const withOutAll = (exclude) => {
  return `required_without_all:${requiredAtLeastOne.filter((row) => row !== exclude).join()}`;
};

const withOutAllMessage = Antl.formatMessage('messages.validation.withOutAll', {
  action: 'store',
  entity: 'search project',
});

const requiredIf = (field, reason) => {
  return Antl.formatMessage('messages.validation.required_if', { field, reason });
};

const type = (field, type) => {
  return Antl.formatMessage('messages.validation.type', { field, type });
};

class StoreSearchProject {
  get rules() {
    return {
      name: 'required|max:255|string',
      is_private: 'required|boolean',

      candidates: `${withOutAll('candidates')}|array`,
      hiring_authorities: `${withOutAll('hiring_authorities')}|array`,
      names: `${withOutAll('names')}|array`,
      job_orders: `${withOutAll('job_orders')}|array`,

      'candidates.*': 'integer',
      'hiring_authorities.*': 'integer',
      'names.*': 'integer',
      'job_orders.*': 'integer',

      candidate_query: `${withOutAll('candidate_query')}|object`,
      'candidate_query.query': 'required_if:candidate_query|object',
      'candidate_query.exclude': 'array',
      'candidate_query.exclude.*': 'number',

      joborder_query: `${withOutAll('joborder_query')}|object`,
      'joborder_query.query': 'required_if:joborder_query|object',
      'joborder_query.exclude': 'array',
      'joborder_query.exclude.*': 'number',

      name_query: `${withOutAll('name_query')}|object`,
      'name_query.query': 'required_if:name_query|object',
      'name_query.exclude': 'array',
      'name_query.exclude.*': 'object',
      'name_query.exclude.*.id': 'required_if:name_query.exclude|number',
      'name_query.exclude.*.role_id': 'required_if:name_query.exclude|number',

      search_project_id: 'required_if:search_params|integer|existsFd:search_projects,id',

      search_params: `${withOutAll('search_params')}|object`,
      'search_params.query': 'required_if:search_params|object',
      'search_params.exclude': 'array',
      'search_params.exclude.*': 'object',
      'search_params.exclude.*.id': 'required_if:search_params.exclude|number',
      'search_params.exclude.*.item_search_project_type': 'required_if:search_params.exclude|number',
    };
  }

  get messages() {
    return {
      'name.required': Antl.formatMessage('messages.validation.required', { field: 'name' }),
      'is_private.required': Antl.formatMessage('messages.validation.required', { field: 'is private' }),

      'candidates.required_without_all': withOutAllMessage,
      'hiring_authorities.required_without_all': withOutAllMessage,
      'names.required_without_all': withOutAllMessage,
      'job_orders.required_without_all': withOutAllMessage,
      'candidate_query.required_without_all': withOutAllMessage,
      'joborder_query.required_without_all': withOutAllMessage,
      'name_query.required_without_all': withOutAllMessage,

      'candidates.*.integer': type('candidates', 'integer'),
      'hiring_authorities.*.integer': type('hiring authorities', 'integer'),
      'names.*.integer': type('names', 'integer'),
      'job_orders.*.integer': type('job orders', 'integer'),

      'candidate_query.query.required_if': requiredIf('candidates query', 'the candidates query are passed'),
      'candidate_query.query.object': type('candidates query', 'object'),
      'candidate_query.exclude.array': type('candidates exclude', 'array'),
      'candidate_query.exclude.*.number': type('candidates exclude object', 'number'),

      'joborder_query.query.required_if': requiredIf('candidates query', 'the candidates query are passed'),
      'joborder_query.query.object': type('candidates query', 'object'),
      'joborder_query.exclude.array': type('candidates exclude', 'array'),
      'joborder_query.exclude.*.number': type('candidates exclude object', 'number'),

      'name_query.query.required_if': requiredIf('name query', 'the name query are passed'),
      'name_query.query.object': type('name query', 'object'),
      'name_query.exclude.array': type('name exclude', 'array'),
      'name_query.exclude.*.object': type('name exclude object', 'object'),
      'name_query.exclude.*.id.number': type('name exclude object id', 'number'),
      'name_query.exclude.*.id.required_if': requiredIf('name exclude object id', 'an exclude array row is passed'),
      'name_query.exclude.*.role_id.number': type('name exclude object type', 'number'),
      'name_query.exclude.*.role_id.required_if': requiredIf(
        'name exclude object type id',
        'an exclude array row is passed'
      ),

      'search_project_id.integer': type('search project id', 'integer'),
      'search_project_id.required': requiredIf('search project id', 'the search params are passed'),
      'search_project_id.existsFd': Antl.formatMessage('messages.validation.notExist', { entity: 'search project id' }),

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

      'name.max': Antl.formatMessage('messages.validation.max', { field: 'name', size: 255 }),
    };
  }

  async fails(errorMessages) {
    return this.ctx.response.status(400).send(errorMessages);
  }
}

module.exports = StoreSearchProject;
