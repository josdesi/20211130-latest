'use strict';
const ZipCode = use('App/Models/ZipCode');
const appInsights = require('applicationinsights');
const Database = use('Database');
const {multipleFilterParser} = (use('App/Helpers/QueryFilteringUtil'));

class LocationRepository {

  async zipsByCity(city_id, keyword, limit) {
    try {
      const query = Database.from('v_zip_codes')
        .select([
          'zip_ch as id',
          'formatted_zip as title',
        ])
        .where('city_id', city_id)
        .orderBy('zip');
      if (keyword) {
        query.where('zip_ch', 'ilike', `%${keyword}%`);
      }
      if(limit){
        query.limit(limit)
      }
      const result = await query;
      return {
        success: true,
        code: 200,
        data: result,
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      return {
        success: false,
        code: 500,
        message: 'There was a problem getting the Zip Codes',
      };
    }
  }

  async citiesByFilter(req) {
    try {
        const { keyword='' , limit, isState } = req;
      
        const query =  Database.table('v_cities as cities')
        query
          .select([ 
            'cities.id',
            'cities.title as title',
            'cities.state',
            'state_slug as slug',
            'is_state',
          ])
          .where('searchable_text', 'ilike', `${keyword}%`)
          .orderBy('state','asc')
          .orderBy('title', 'asc')

        if (typeof isState !== 'undefined') {
          query.where('is_state', isState)
        }
        if (limit) {
          query.limit(limit);
        }
        const cities = await query
        return { 
          success:true,
          code:200,
          data:cities
        } 
      } catch (error) {
        appInsights.defaultClient.trackException({ exception: error });

        return {
          success:false,
          code:500,
          message: 'There was a problem getting the Cities',
        };
      }
  }


  async existZipOnCity(zip,city_id){
    return await ZipCode.query().where('zip_ch', zip).where('city_id', city_id).first();
  }

  async findByZip(zip){
    return await ZipCode.query().where('zip_ch', zip).first();
  }

  async searchZipCodes({keyword, stateIds, cityIds, limit}) {
    try {
      const parsedStateIds = multipleFilterParser(stateIds);
      const parsedCityIds = multipleFilterParser(cityIds);
      const query = Database.from('v_zip_codes')
        .select([
          'city_id',
          'state_id',
          'zip_ch as id',
          'formatted_zip as title',
          'city',
          'state',
          'state_slug',
          'country',
          'country_slug',
          'formatted_zip',
          Database.raw("concat(city,', ', state_slug) as city_state"),
        ]);

      if (parsedCityIds) {
        query.whereIn('city_id', parsedCityIds);
      } else  if (parsedStateIds) {
        query.whereIn('state_id', parsedStateIds);
      }
      if (keyword) {
        query.where('formatted_zip', 'ilike', `${keyword}%`);
      }

      if(limit){
        query.limit(limit)
      }
      query.orderBy('state_slug','asc').orderBy('city', 'asc');
      const result = await query;
      return {
        success: true,
        code: 200,
        data: result,
      };
    } catch(error) {
      appInsights.defaultClient.trackException({ exception: error });

      return {
        success: false,
        code: 500,
        message: 'There was a problem getting the Zip Codes',
      };
    }
  }

}

module.exports = LocationRepository;
