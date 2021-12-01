'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')
const Database = use('Database')
class CitiesSchema extends Schema {
  up () {
    this.table('cities', (table) => {
      
    })

    this.schedule(async (transaction) => {
      const createViewQuery = `
      create materialized view v_zip_codes as 
      select 
        zip_codes.id,
        zip_codes.zip,
        zip_codes.city_id,
        zip_codes.state_id,
        zip_codes.longitude,
        zip_codes.latitude,
        zip_codes.zip_ch,
        zip_codes.formatted_zip,
        city.title as city,
        state.title  as state,
        state.slug as state_slug,
        country.title  as country,
        country.slug as country_slug
      from zip_codes
      join cities city on city.id = zip_codes.city_id 
      join states state on state.id = zip_codes.state_id 
      join countries country on country.id = state.country_id`;
      const createCityIndexQuery = `create index on v_zip_codes (city_id);`;
      const createStateIndexQuery = `create index on v_zip_codes (state_id);`;
      const createTextSearchIndex = `CREATE INDEX v_zip_codes_txt_idx  ON v_zip_codes USING gin  (formatted_zip gin_trgm_ops);`;
      try {
        await Database.raw(createViewQuery).transacting(transaction);
        await Database.raw(createCityIndexQuery).transacting(transaction);
        await Database.raw(createStateIndexQuery).transacting(transaction);
        await Database.raw(createTextSearchIndex).transacting(transaction);
        await transaction.commit();
      } catch(error) {
        await transaction.rollback();
      }
    });
  }

  down () {
    this.table('cities', (table) => {
      // reverse alternations
    })
  }
}

module.exports = CitiesSchema
