'use strict';

//Models
const SendgridConfiguration = use('App/Models/SendgridConfiguration');

//Utils
const appInsights = require("applicationinsights");

class SendgridConfigurationRepository {
  /**
   * Returns a SendgridConfiguration Object
   * 
   * @param {String} type
   * 
   * @return {Object} A SendgridConfiguration object 
  */
  async getByType(type){
    try {
      return await SendgridConfiguration.findByOrFail('type', type);      
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
    }
  }
}

module.exports = SendgridConfigurationRepository;
