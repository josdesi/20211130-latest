'use strict'
const appInsights = require("applicationinsights");

const LocationRepository = new (use('App/Helpers/LocationRepository'))();

class ZipCodeController {
  /**
   * Return all the zip codes from a city .
   * GET /zips
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async searchZipCodes({ response, request }) {
     try {
       const filterOptions = request.only([
         'cityIds',
         'stateIds',
         'keyword',
         'limit'
       ]);
       const result = await LocationRepository.searchZipCodes(filterOptions);
  
       if (result.success && result.data) {
         return response.status(result.code).send(result.data);
       }
  
       return response.status(result.code).send(result);
    
      } catch (error) {
        appInsights.defaultClient.trackException({exception: error});
        return response.status(500).send({
          message: 'There was a problem retrieving zip codes' 
        });
      }
  }
}

module.exports = ZipCodeController
