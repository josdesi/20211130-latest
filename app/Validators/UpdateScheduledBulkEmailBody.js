'use strict';

class UpdateScheduledBulkEmailBody {
  get rules() {
    return {
      search_project_id: 'integer|existsFd:search_projects,id',
      block_resend: 'boolean',
      subject: 'max:254|string',
      text: 'string',
      html: 'string',
      files: 'array',
      block_duration_days: 'integer|required_when:block_resend,true',
    };
  }

  get messages() {
    return {
      'subject.max': 'The subject size is too long.',

      'block_duration_days.required_when': 'You must specify how many days the block resend will look into the past to apply the rule',

      'search_project_id.existsFd': 'The search project provided is not valid',
    };
  }

  async fails(errorMessages) {
    return this.ctx.response.status(400).send(errorMessages);
  }
}

module.exports = UpdateScheduledBulkEmailBody;
