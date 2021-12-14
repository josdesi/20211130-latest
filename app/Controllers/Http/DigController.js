'use strict';

const DigRepository = new (use('App/Helpers/DigRepository'))();
/** @typedef {import('@adonisjs/framework/src/Request')} Request */
/** @typedef {import('@adonisjs/framework/src/Response')} Response */
/** @typedef {import('@adonisjs/framework/src/View')} View */

/**
 * Resourceful controller for interacting with DIG - Domain, Industry, Geography
 */
class DigController {
  /**
   * Show a list of all recruiters with industry and state information.
   * Each row in the results is flat, meaning there are no nested json objects.
   * GET recruiters industries
   *
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async index({ request, response }) {
    const queryParams = request.only([
      'industryId', 
      'stateId', 
      'specialtyId', 
      'subspecialtyId', 
      'coachId', 
      'recruiterId',
      'keyword'
    ]);
    const result = await DigRepository.getDigMap(queryParams);

    return response.status(result.code).send(result.data || result);
  }

  /**
   * Create/save a new DIG.
   * POST recruiters
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async store({ request, response, auth }) {
    const userAuthId = auth.current.user.id;
    const { user, dig } = request.only([
      'user',
      'dig'
    ]);
    const result = await DigRepository.save(
      user,
      dig,
      userAuthId
    );

    return response.status(result.code).send(result.data || result);
  }

  /**
   * Update recruiter details.
   * PUT or PATCH dig/:id
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async update({ params, request, response }) {}


  
  async getUserDig({params, request, response}){
    const isFlatFormat = request.input('isFlatFormat');
    const result = await DigRepository.getUserDig(params.id, isFlatFormat);
    return response.status(result.code).send(result.data || result);
  }
}

module.exports = DigController;
