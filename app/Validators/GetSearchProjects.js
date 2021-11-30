'use strict';

class GetSearchProjects {
  get rules() {
    return {
      keyword: 'string',
      createdBy: 'integer|existsFd:users,id',
      onlyMine: 'boolean',
      searchProjectType: 'integer',
      page: 'integer',
      perPage: 'integer',
      orderBy: 'string',
      direction: 'string',
      addedDate: 'date',
      isPrivate: 'boolean',
    };
  }

  get sanitizationRules() {
    return {
      onlyMine: 'to_boolean',
      isPrivate: 'to_boolean',
      perPage: 'to_int',
      page: 'to_int',
    };
  }

  get messages() {
    return {
      'onlyMine.boolean': 'The onlue mine filter must be a boolean',
      'isPrivate.boolean': 'The is private filter must be a boolean',

      'createdBy.integer': 'The created by must be a valid number',
      'searchProjectType.integer': 'The search project type must be a valid number',
      'page.integer': 'The page must be a valid number',
      'perPage.integer': 'The per page must be a valid number',

      'createdBy.existsFd': 'The created by user passed does not exists',
    };
  }

  async fails(errorMessages) {
    return this.ctx.response.status(400).send(errorMessages);
  }
}

module.exports = GetSearchProjects;
