'use strict'

/** @typedef {import('@adonisjs/framework/src/Request')} Request */
/** @typedef {import('@adonisjs/framework/src/Response')} Response */
/** @typedef {import('@adonisjs/framework/src/View')} View */
const {multipleFilterParser} = (use('App/Helpers/QueryFilteringUtil'));

const appInsights = require("applicationinsights");
const Specialty = use('App/Models/Specialty');
const Database = use('Database');
/**
 * Resourceful controller for interacting with specialties
 */
class SpecialtyController {
  /**
   * Show a list of all specialties.
   * GET specialties
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   * @param {View} ctx.view
   */
  async index ({ request, response }) {
    try {
      const {industryId, industryIds, keyword, limit} = request.all();
      const tsQuery = this.buildTsQuery(keyword);
      const parsedIndustryIds = multipleFilterParser(industryIds);
      const query = Database.table('v_specialties as spec')
        .select([
          'spec.id as id',
          'industry as industry_title',
          'spec.title as title',
          'spec.industry_id as industry_id'
        ])
        .orderBy('industry')
        .orderBy('spec.title')
      if (industryId) {
        query.where('industry_id', industryId)
      }
      
      if (parsedIndustryIds) {
        query.whereIn('industry_id', parsedIndustryIds);
      }

      if (tsQuery) {
        query.whereRaw(`document_tokens @@ to_tsquery('simple', ?)`, [tsQuery]);
      }
      if (limit) {
        query.limit(limit);
      }
      return response.ok(await query);
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      return response.status(500).send({
        message:'There was an error getting the specialties'
      });
    }
  }

  buildTsQuery(input) {
    if (!input) return '';
    return input.toLowerCase().split(' ').filter(input => input !== '').map(word => `${word}:*`).join(' & ');
  }

  /**
   * Show a list of all subspecialties.
   * GET specialties/:id/subspecialties
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async subspecialties({ params, response }){
    try {
      const specialty = await Specialty.find(params.id);
      if(!specialty){
        return response.status(404).send({
            success: false,
            code: 404,
            message: 'Specialty not found',
          })
      }
      const subspecialties = await specialty.subspecialties()
        .select('id','specialty_id','title')
        .orderBy('title', 'asc')
        .fetch();
      return response.ok(subspecialties);
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      return response.status(500).send({
        message:'There was an error getting the subspecialties'
      });
    }
  }
}

module.exports = SpecialtyController
