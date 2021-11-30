'use strict';

class GetOptOuts {
  get rules() {
    return {
      isUnsubscribe: 'boolean',
      createdBy: 'integer|existsFd:users,id',
      direction: 'string',
      orderBy: 'string',
      keyword: 'string',
      page: 'integer',
      perPage: 'integer',
    };
  }

  get sanitizationRules() {
    return {
      isUnsubscribe: 'to_boolean',
    };
  }

  get messages() {
    return {
      'isUnsubscribe.boolean': 'The is unsubscribe flag must be a boolean',

      'createdBy.integer': 'The user id in created by must be a valid number',
      'page.integer': 'The page must be a valid number',
      'perPage.integer': 'The per page must be a valid number',

      'direction.string': 'The direction must be a valid string',
      'orderBy.string': 'The direction must be a valid string',
      'keyword.string': 'The direction must be a valid string',

      'createdBy.existsFd': 'The user id in created by passed does not exists',
    };
  }

  async fails(errorMessages) {
    return this.ctx.response.status(400).send(errorMessages);
  }
}

module.exports = GetOptOuts;
