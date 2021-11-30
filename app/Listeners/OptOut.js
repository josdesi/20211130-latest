'use strict';

//Utils
const appInsights = require('applicationinsights');

//Repositories
const BulkEmailOptOutRepository = new (use('App/Helpers/BulkEmailOptOutRepository'))();
const OptOut = {
  /**
   * Log a opt out change
   *
   * @description Use this whenver a change is made to a opt out & is deemed important to record in the audit trail
   *
   * @param {Number} email - The email that suffered the change
   * @param {String} entity - What changed in the opt out (type, ..., etc)
   * @param {String} operation - Related operation (create, update, delete)
   * @param {Object} payload - Content of the changed object
   * @param {Number} userId - Who made the change
   *
   */
  logChange: async ({ email, entity, operation, payload, userId = null }) => {
    try {
      await BulkEmailOptOutRepository.logChange(email, entity, operation, payload, userId);
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
    }
  },
};

module.exports = OptOut;
