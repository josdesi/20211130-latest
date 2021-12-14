'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');

class CitiesSchema extends Schema {
  up() {
    this.raw(`
      DROP MATERIALIZED VIEW v_cities;

      CREATE MATERIALIZED VIEW v_cities
      AS
       SELECT cty.id,
          cty.title,
          st.id AS state_id,
          st.title AS state,
          st.slug AS state_slug,
          coty.id AS country_id,
          coty.title AS country,
          coty.slug AS country_slug,
        cty.is_state as is_state,
        cty.title || ' ' || st.title as searchable_text
         FROM cities cty
           JOIN states st ON cty.state_id = st.id
           JOIN countries coty ON st.country_id = coty.id
        ORDER BY coty.id, st.id, cty.id
      WITH DATA;
      
      CREATE UNIQUE INDEX v_cities_unique_idx
          ON v_cities USING btree
          (id)
          TABLESPACE pg_default;
        
      CREATE INDEX v_cities_search_idx
          ON v_cities USING btree
          (searchable_text ASC NULLS LAST);      
  `);
  }

  down() {
    this.table('cities', (table) => {
      // reverse alternations
    });
  }
}

module.exports = CitiesSchema;
