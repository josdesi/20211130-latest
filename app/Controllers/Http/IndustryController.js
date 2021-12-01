'use strict';


const appInsights = require("applicationinsights");
const Industry = use('App/Models/Industry');
const IndustryRepository = new (use('App/Helpers/IndustryRepository'))();

/** @typedef {import('@adonisjs/framework/src/Request')} Request */
/** @typedef {import('@adonisjs/framework/src/Response')} Response */
/** @typedef {import('@adonisjs/framework/src/View')} View */

/**
 * Resourceful controller for interacting with industries
 */
class IndustryController {
  /**
   * Show a list of all industries.
   * GET industries
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   * @param {View} ctx.view
   */
  async index({ response, request}) {
    try {
      const standalone = this.parseBoolean(request.input('standalone'));
      const query = Industry.query();

      if (!standalone) {
        query.with('specialties',builder=>{
          builder.select('id','industry_id','title')
          builder.with('subspecialties',builder=>{
            builder.select('id','specialty_id','title')
            builder.orderBy('title', 'asc')
          })
        })
      } else {
        query.select(['id', 'title']);
      }
      const industries = await query
        .orderBy('title', 'asc')
        .fetch();

      return response.ok(industries);
    } catch (err) {
      appInsights.defaultClient.trackException({ exception: err });

      return response.status(500).send({
        message: "There was a problem getting all the Industries"
      });
    }
  }

  parseBoolean(input) {
    const stringMap = {
      'true': true,
      'false': false,
      '1': true,
      '0': false
    };

    return !!stringMap[input];
  }

  /**
   * Create/save a new industry.
   * POST industries
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async store({ auth, request, response }) {
    const { title, email, specialties } = request.only(['title', 'email', 'specialties']);

    const result = await IndustryRepository.create(title, email, specialties, auth.current.user.id);
    
    return response.status(result.code).send(result.success ? result.data : result);
  }

  /**
   * Display a single industry.
   * GET industries/:id
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   * @param {View} ctx.view
   */
  async show({ params, response }) {
    try {
      const industryId = Number.parseInt(params.id, 10);
      if (Number.isNaN(industryId)) {
        return response.status('400').send({
          message:'Bad request'
        });
      }

      const industry = await Industry.findOrFail(industryId);

      return response.ok(industry);
    } catch (err) {
      appInsights.defaultClient.trackException({ exception: err });

      if (err.name === 'ModelNotFoundException') {
        return response.status('404').send({
          message:'Position not found'
        });
      }

      return response.status(500).send({
        message: 'There was an error retrieving the industry'
      });
    }
  }

  /**
   * Update industry details.
   * PUT or PATCH industries/:id
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async update({ params, auth, request, response }) {
    const { title, email, specialties } = request.only(['title', 'email', 'specialties']);

    const result = await IndustryRepository.update(params.id, title, email, specialties, auth.current.user.id);
    
    return response.status(result.code).send(result.success ? result.data : result);
  }


  /**
   * Delete a industry with id.
   * DELETE industries/:id
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async destroy({ params, request, response }) {}
}

module.exports = IndustryController;
