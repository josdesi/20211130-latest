'use strict';

class UpdateSearchProjectInventory {
  get rules() {
    return {
      candidates: 'array',
      hiring_authorities: 'array',
      names: 'array',
      job_orders: 'array',
      'candidates.*': 'integer',
      'hiring_authorities.*': 'integer',
      'names.*': 'integer',
      'job_orders.*': 'integer',
      candidate_query: 'object',
      'candidate_query.query': 'required_if:candidate_query|object',
      'candidate_query.exclude': 'array',
      'candidate_query.exclude.*': 'number',
      joborder_query: 'object',
      'joborder_query.query': 'required_if:joborder_query|object',
      'joborder_query.exclude': 'array',
      'joborder_query.exclude.*': 'number',
      name_query: 'object',
      'name_query.query': 'required_if:name_query|object',
      'name_query.exclude': 'array',
      'name_query.exclude.*': 'object',
      'name_query.exclude.*.id': 'required_if:name_query.exclude|number',
      'name_query.exclude.*.role_id': 'required_if:name_query.exclude|number',
    };
  }

  get messages() {
    return {
      'candidates.array': 'A list of candidates was expected',
      'hiring_authorities.array': 'A list of candidates was expected',
      'names.array': 'A list of candidates was expected',
      'job_orders.array': 'A list of job orders was expected',

      'candidates.array.*': 'The candidate must be a integer',
      'hiring_authorities.array.*': 'The hiring authority must be a integer',
      'names.array.*': 'The name must be a integer',
      'job_orders.array.*': 'The job order must be a integer',

      'candidate_query.query.required_if': 'You must pass what query was used in the candidate listing!',
      'joborder_query.query.required_if': 'You must pass what query was used in the job orders listing!',
      'name_query.query.required_if': 'You must pass what query was used in the candidate listing!',

      'candidate_query.query.object': 'The query must be an object',
      'joborder_query.query.object': 'The query must be an object',
      'name_query.query.object': 'The query must be an object',
      'name_query.exclude.*.object': 'The exclude array must be of objects',

      'candidate_query.exclude.array': 'The exclude list must be an array',
      'joborder_query.exclude.array': 'The exclude list must be an array',
      'name_query.exclude.array': 'The exclude list must be an array',

      'candidate_query.exclude.*.number': 'The exclude list for candidates must contain only numbers',
      'joborder_query.exclude.*.number': 'The exclude list for job orders must contain only numbers',
      'joborder_query.exclude.*.id.number': 'The exclude list for job orders must contain only numbers',
      'joborder_query.exclude.*.role_id.number': 'The exclude list for job orders must contain only numbers',
    };
  }

  async fails(errorMessages) {
    return this.ctx.response.status(400).send(errorMessages);
  }
}

module.exports = UpdateSearchProjectInventory;
