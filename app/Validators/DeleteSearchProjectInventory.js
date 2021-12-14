'use strict';
const Antl = use('Antl');

class DeleteSearchProjectInventory {
  get rules() {
    return {
      candidates: 'array',
      hiring_authorities: 'array',
      names: 'array',

      'candidates.*': 'integer',
      'hiring_authorities.*': 'integer',
      'names.*': 'integer',

      search_params: 'object',
      'search_params.query': 'required_if:search_params|object',
      'search_params.exclude': 'array',
      'search_params.exclude.*': 'object',
      'search_params.exclude.*.id': 'required_if:search_params.exclude|number',
      'search_params.exclude.*.item_search_project_type': 'required_if:search_params.exclude|number',
    };
  }

  get messages() {
    return {
      'candidates.array': Antl.formatMessage('messages.validation.type', { field: 'candidates', type: 'array' }),
      'hiring_authorities.array': Antl.formatMessage('messages.validation.type', {
        field: 'hiring authorities',
        type: 'array',
      }),
      'names.array': Antl.formatMessage('messages.validation.type', { field: 'names', type: 'array' }),

      'candidates.array.*': Antl.formatMessage('messages.validation.type', { field: 'candidates', type: 'number' }),
      'hiring_authorities.array.*': Antl.formatMessage('messages.validation.type', {
        field: 'hiring authorities',
        type: 'number',
      }),
      'names.array.*': Antl.formatMessage('messages.validation.type', { field: 'names', type: 'number' }),

      'search_params.query.required_if': Antl.formatMessage('messages.validation.required_if', {
        field: 'search params',
        reason: 'the search params are passed',
      }),
      'search_params.query.object': Antl.formatMessage('messages.validation.type', {
        field: 'search query',
        type: 'object',
      }),
      'search_params.exclude.array': Antl.formatMessage('messages.validation.type', {
        field: 'search exclude',
        type: 'array',
      }),
      'search_params.exclude.*.object': Antl.formatMessage('messages.validation.type', {
        field: 'search exclude object',
        type: 'object',
      }),
      'search_params.exclude.*.id.number': Antl.formatMessage('messages.validation.type', {
        field: 'search exclude object id',
        type: 'number',
      }),
      'search_params.exclude.*.id.required_if': Antl.formatMessage('messages.validation.required_if', {
        field: 'search exclude object id',
        reason: 'an exclude array row is passed',
      }),
      'search_params.exclude.*.item_search_project_type.number': Antl.formatMessage('messages.validation.type', {
        field: 'search exclude object type',
        type: 'number',
      }),
      'search_params.exclude.*.item_search_project_type.required_if': Antl.formatMessage(
        'messages.validation.required_if',
        {
          field: 'search exclude object type id',
          reason: 'an exclude array row is passed',
        }
      ),
    };
  }

  async fails(errorMessages) {
    return this.ctx.response.status(400).send(errorMessages);
  }
}

module.exports = DeleteSearchProjectInventory;
