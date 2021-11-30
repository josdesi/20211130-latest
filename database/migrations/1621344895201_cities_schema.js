'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');
const Database = use('Database');

class CitiesSchema extends Schema {
  up() {
    this.schedule(async (transaction) => {
      const dropView = 'DROP MATERIALIZED VIEW v_cities;';
      const createView = `
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
            cty.is_state,
            (cty.title::text || ' '::text) || st.title::text AS searchable_text,
            coalesce(zip_count.total, 0) as zip_count
          FROM cities cty
            JOIN states st ON cty.state_id = st.id
            JOIN countries coty ON st.country_id = coty.id
            LEFT JOIN (select count(*) total, city_id from zip_codes  group by city_id) as zip_count on cty.id = zip_count.city_id
          ORDER BY coty.id, st.id, cty.id
        WITH DATA;`;
      const createIndexes = `CREATE INDEX v_cities_search_idx
            ON v_cities USING btree (searchable_text COLLATE pg_catalog."default");

          CREATE UNIQUE INDEX v_cities_unique_idx
            ON v_cities USING btree (id);`;
      try {
        await Database.raw(dropView).transacting(transaction);
        await Database.raw(createView).transacting(transaction);
        await Database.raw(createIndexes).transacting(transaction);
        await transaction.commit();
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    });
  }

  down() {
    this.table('cities', (table) => {
      // reverse alternations
    });
  }
}

module.exports = CitiesSchema;
