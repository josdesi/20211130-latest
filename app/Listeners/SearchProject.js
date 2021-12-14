'use strict';

//Utils
const appInsights = require('applicationinsights');

//Repositories
const SearchProjectRepository = new (use('App/Helpers/SearchProjectRepository'))();
const SearchProject = {
  /**
   * Log a search project change
   *
   * @description Use this whenver a change is made to a search project & is deemed important to record in the audit trail
   *
   * @param {Number} searchProjectId - The SP that suffered the change
   * @param {String} entity - What changed in the SP (item added, ..., etc)
   * @param {String} operation - Related operation (create, update, delete)
   * @param {Object} payload - Content of the changed object
   * @param {Number} userId - Who made the change
   *
   */
  logChange: async ({ searchProjectId, entity, operation, payload, userId = null }) => {
    try {
      await SearchProjectRepository.logChange(searchProjectId, entity, operation, payload, userId);
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
    }
  },
};

module.exports = SearchProject;
