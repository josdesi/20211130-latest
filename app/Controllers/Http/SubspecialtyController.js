'use strict'
const appInsights = require("applicationinsights");

const Database = use('Database');
const {multipleFilterParser} = (use('App/Helpers/QueryFilteringUtil'));
class SubspecialtyController {

  async index({request, response}) {
    try {

      const query = Database
        .from('v_subspecialties as subspecialties')
        .select(['id', 'title', 'specialty_id', 'specialty as specialty_title', 'specialty', 'industry'])
      const specialtyIds = multipleFilterParser(request.input('specialtyIds'));
      const industryIds = multipleFilterParser(request.input('industryIds'));
      const keyword = request.input('keyword');
      if (specialtyIds) {
        query.whereIn('specialty_id', specialtyIds)
      } else if (industryIds) {
        query.whereIn('industry_id', industryIds);
      }
      const tsQuery = this.buildTsQuery(keyword);
      if (tsQuery) {
        query.whereRaw(`document_tokens @@ to_tsquery('simple', ?)`, [tsQuery])
          .orderByRaw(`ts_rank(document_tokens, to_tsquery('simple', ?)) desc`, [tsQuery]);
      } else {
        query.orderBy('specialty', 'asc')
          .orderBy('subspecialties.title', 'asc');
      }
      return await query;
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      return response.status(500).send({
        message: "There was a problem getting the subspecialties"
      });
    }
  }
  buildTsQuery(input) {
    if (!input) return '';
    return input.toLowerCase().split(' ').filter(input => input !== '').map(word => `${word}:*`).join(' & ');
  }



}

module.exports = SubspecialtyController
