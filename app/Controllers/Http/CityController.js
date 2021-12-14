'use strict';

const Database = use('Database');
const LocationRepository = new (use('App/Helpers/LocationRepository'))();
const appInsights = require('applicationinsights');
/** @typedef {import('@adonisjs/framework/src/Request')} Request */
/** @typedef {import('@adonisjs/framework/src/Response')} Response */
/** @typedef {import('@adonisjs/framework/src/View')} View */

/**
 * Resourceful controller for interacting with cities
 */
class CityController {
  /**
   * Show a list of all cities.
   * GET cities
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   * @param {View} ctx.view
   */
  async index({ request, response }) {
    try {
      const { stateId, keyword='', isState = 0, limit } = request.only(['stateId','keyword','limit', 'isState']);

      const query = Database.table('v_cities as cty')
        .select([
          'cty.id',
          'cty.title',
          'cty.state_id',
          'cty.is_state',
          'zip_count as total_zips'
        ])
        .where('cty.state_id',stateId)
        .where('cty.is_state', isState);
      if(keyword){
        query.where('cty.title', 'ilike', `%${keyword}%`);
      }
      query.orderBy('cty.title', 'asc');

      if(limit){
        query.limit(limit)
      }
      const cities = await query;
      return response.ok(cities);
    } catch (err) {
      appInsights.defaultClient.trackException({ exception: err });
      return response.status(500).send({
        message: 'There was a problem getting the cities',
      });
    }
  }

  /**
   * Return all the zip codes from a city .
   * GET cities/:id/zips
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async zipCodes({ params, response, request }) {
    const { keyword, limit }  = request.only(['keyword','limit'])
    const result = await LocationRepository.zipsByCity(params.id,keyword,limit);

    if (result.success && result.data) {
      return response.status(result.code).send(result.data);
    }

    return response.status(result.code).send(result);
  }

    /**
   * Return all the cities by title.
   * GET cities/search
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async searchByTitle({ request, response }) {
    const result = await LocationRepository.citiesByFilter(request.all());

    return response.status(result.code).send( result.success ? result.data : result )
  }

  /**
   * Render a form to be used for creating a new city.
   * GET cities/create
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   * @param {View} ctx.view
   */
  async create({ request, response, view }) {}

  /**
   * Create/save a new city.
   * POST cities
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async store({ request, response }) {}

  /**
   * Display a single city.
   * GET cities/:id
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   * @param {View} ctx.view
   */
  async show({ params, request, response, view }) {}

  /**
   * Render a form to update an existing city.
   * GET cities/:id/edit
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   * @param {View} ctx.view
   */
  async edit({ params, request, response, view }) {}

  /**
   * Update city details.
   * PUT or PATCH cities/:id
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async update({ params, request, response }) {}

  /**
   * Delete a city with id.
   * DELETE cities/:id
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async destroy({ params, request, response }) {}
}

module.exports = CityController;
