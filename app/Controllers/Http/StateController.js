'use strict';

const appInsights = require("applicationinsights");
const Database = use('Database');

/** @typedef {import('@adonisjs/framework/src/Request')} Request */
/** @typedef {import('@adonisjs/framework/src/Response')} Response */
/** @typedef {import('@adonisjs/framework/src/View')} View */

/**
 * Resourceful controller for interacting with locations
 */
class StateController {
  /**
   * Show a list of all locations.
   * GET locations
   *
   * @param {object} ctx
   * @param {Response} ctx.response
   */
  async index({ response, request  }) {
    try {
      const countryId  = request.input('countryId');
      const query = Database.table('states as st')
        .select([
          'st.id',
          'st.title',
          'st.slug as state_slug',
          'ctry.title as country_title',
          'ctry.id as country_id',
          'ctry.slug as country_slug',
          Database.raw(`ctry.slug || ': ' || st.title as compound_title`),
          Database.raw('count (cty.id) as total_cities'),
        ])
        .innerJoin('countries as ctry','st.country_id','ctry.id')
        .leftJoin('cities as cty','st.id','cty.state_id')
        .where('ctry.available_for_recruiting', true)
        .groupByRaw(`
          st.id,
          st.title,
          st.slug,
          ctry.title,
          ctry.id,
          ctry.slug,
          compound_title
        `)
        .orderBy('ctry.id')
        .orderBy('st.title');

      if (countryId) {
        query.where('ctry.id', countryId)
      }
      return response.ok(await query);
    } catch (err) {
      appInsights.defaultClient.trackException({ exception: err });

      return response.status(500).send({
        message:"There was a problem getting all the locations , please try again later!"
      });
    }
  }

  /**
   * Create/save a new location.
   * POST locations
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async store({ request, response }) {}
}

module.exports = StateController;
