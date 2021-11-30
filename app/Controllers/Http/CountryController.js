'use strict'
const Database = use ('Database');
class CountryController {
  /**
   * Show a list of all countries
   * GET countries
   *
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async index({response}) {
    try {
      return response.ok(await Database.from('countries').select('*').where('available_for_recruiting', true).orderBy('id'));
    } catch(error) {
      appInsights.defaultClient.trackException({ exception: err });
      return response.status(500).send({
        message: 'There was a problem getting the recruiters',
      });
    }
  }
}

module.exports = CountryController
