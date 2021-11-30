'use strict';

//Utils
const appInsights = require('applicationinsights');

//Repositories
const EmailTrackingBlockListRepository = new (use('App/Helpers/EmailTrackingBlockListRepository'))();

const EmailTrackingBlockList = {
  logChange: async ({ email, entity, operation, payload, userId }) => {
    try {
      await EmailTrackingBlockListRepository.logChange(email, entity, operation, payload, userId);
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
    }
  },
};

module.exports = EmailTrackingBlockList;
