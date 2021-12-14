'use strict';

//Utils
const Antl = use('Antl');
const Database = use('Database');
const appInsights = require("applicationinsights");
const { multipleFilterParser } = require("../../Helpers/QueryFilteringUtil");

//Models
const Position = use('App/Models/Position');
const CommonPosition = use('App/Models/CommonPosition');

//Repositories
const PositionRepository = new (use('App/Helpers/PositionRepository'))();

/** @typedef {import('@adonisjs/framework/src/Request')} Request */
/** @typedef {import('@adonisjs/framework/src/Response')} Response */
/** @typedef {import('@adonisjs/framework/src/View')} View */

/**
 * Resourceful controller for interacting with positions
 */
class PositionController {
  /**
   * Show a list of all positions.
   * GET positions
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   * @param {View} ctx.view
   */
  async index({ request, response, view }) {
    try {
      const positions = await Position.query()
        .where(builder => {
          this.applyWhereClause(builder,request.all())
        })
        .orderBy('industry_id', 'asc')
        .orderBy('title', 'asc')
        .fetch();
      return response.ok(positions);
    } catch (err) {
      appInsights.defaultClient.trackException({ exception: err });

      return response.status(500).send({
        message:"There was a problem getting the positions, try again later!"
      });
    }
  }

  applyWhereClause(query,req){
    const { industryId, specialtyId } = req

    if (industryId) {
      query.where('positions.industry_id', industryId);
    }
    if (specialtyId) {
      query.where('positions.specialty_id', specialtyId);
    }
  }

  /**
   * Create/save a new position.
   * POST positions
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async store({ request, response }) {
    try {
      const position = request.all();

      await Position.create(position);
      return response.status(201).send({
        message:'Position created successfully'
      });
    } catch (err) {
      appInsights.defaultClient.trackException({ exception: err });

      return response.status(500).send({
        message:'There was an error while creating the position'
      });
    }
  }

  /**
   * Display a single position.
   * GET positions/:id
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   * @param {View} ctx.view
   */
  async show({ params, request, response, view }) {
    try {
      const positionId = Number.parseInt(params.id, 10);
      if (Number.isNaN(positionId)) {
        return response.status('400').send({
          message:'Bad request'
        });
      }

      const position = await Position.findOrFail(positionId);
      return response.ok(position);
    } catch (err) {
      appInsights.defaultClient.trackException({ exception: err });

      if (err.name === 'ModelNotFoundException') {
        return response.status('404').send({
          message:'Position not found'
        });
      }

      return response.status(500).send({
        message:'There was an error retrieving the position'
      });
    }
  }

  /**
   * Update position details.
   * PUT or PATCH positions/:id
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async update({ params, request, response }) {
    try {
      const positionId = Number.parseInt(params.id, 10);
      if (Number.isNaN(positionId)) {
        return response.status('400').send({
          message:'Bad request'
        });
      }

      const position = await Position.find(positionId);
      if (!position) {
        return response.status('404').send({
          message:'Position not found'
        });
      }

      const { title, industry_id } = request.only(['title', 'industry_id']);
      position.title = title;
      position.industry_id = industry_id;

      await position.save();

      return response.ok(position);
    } catch (err) {
      appInsights.defaultClient.trackException({ exception: err });

      return response.status(500).send({
        message:'There was an error updating the position'
      });
    }
  }

  /**
   * Delete a position with id.
   * DELETE positions/:id
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async destroy({ params, request, response }) {}
    /**
   * Search for positions in equivalent view.
   * Get positions/equivalents
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async searchEquivalents({request, response }) {
    try {
      const {keyword, industryIds, specialtyIds, limit} = request.only(['keyword', 'industryIds', 'specialtyIds']);
      const tsQuery = this.buildTsQuery(keyword);
      const parsedIndustryIds = multipleFilterParser(industryIds);
      const parsedSpecialtyIds = multipleFilterParser(specialtyIds);
      const query = Database.from('v_positions')
        .select(['id', 'title']);
      if (tsQuery) {
        query.whereRaw('? @@ document_tokens', tsQuery);
      }
      if (parsedSpecialtyIds) {
        query.whereIn('specialty_id', parsedSpecialtyIds);
      } else if (parsedIndustryIds) {
        query.whereIn('industry_id', parsedIndustryIds);
      }

      if (limit) {
        query.limit(limit);
      }
      const equivalentPositions = await query;
      return response.ok(equivalentPositions);
    } catch(error) {
      appInsights.defaultClient.trackException({ exception: error });

      return response.status(500).send({
        message:'There was an error getting positions'
      });
    }
  }

  buildTsQuery(input) {
    if (!input) return '';
    return input.toLowerCase().split(' ').filter(input => input !== '').map(word => `${word}:*`).join(' & ');
  }

  /**
   * Show a list of all common positions.
   * GET positions
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   */
  async commons({ response }) {
    try {
      const positions = await CommonPosition.query().orderBy('title').fetch();
      return response.ok(positions);
    } catch (err) {
      appInsights.defaultClient.trackException({ exception: err });

      return response.status(500).send({
        message: Antl.formatMessage('messages.error.internalServer', { action: 'getting', entity: 'positions' }),
      });
    }
  }

  /**
   * Save changes made to the common postitions catalog.
   * POST positions/commons/changes
   *
   * @param {Request} ctx.request
   * @param {Request} ctx.response
   */
   async saveCommons({ request, response }) {
    const { updated, added, deleted } = request.only(['updated', 'added', 'deleted']);

    const result = await PositionRepository.saveCommon(updated, added, deleted);

    return response.status(result.code).send(result.success ? result.data : result);
  }
}

module.exports = PositionController;
