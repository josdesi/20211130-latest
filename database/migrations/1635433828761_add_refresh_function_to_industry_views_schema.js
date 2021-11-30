'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');

class AddRefreshFunctionToIndustryViewsSchema extends Schema {
  up() {
    this.raw(`
      CREATE 
      OR REPLACE FUNCTION fp_refresh_v_specialties() RETURNS void SECURITY DEFINER
      AS $$
      BEGIN
          REFRESH MATERIALIZED VIEW CONCURRENTLY v_specialties;
      RETURN;
      END;
      $$ 
      LANGUAGE plpgsql
    `);
    this.raw(`
      CREATE 
      OR REPLACE FUNCTION fp_refresh_v_subspecialties() RETURNS void SECURITY DEFINER
      AS $$
      BEGIN
          REFRESH MATERIALIZED VIEW CONCURRENTLY v_subspecialties;
      RETURN;
      END;
      $$ 
      LANGUAGE plpgsql
    `);
    this.raw(`
      CREATE 
      OR REPLACE FUNCTION fp_refresh_v_positions() RETURNS void SECURITY DEFINER
      AS $$
      BEGIN
          REFRESH MATERIALIZED VIEW CONCURRENTLY v_positions;
      RETURN;
      END;
      $$ 
      LANGUAGE plpgsql
    `);
  }

  down() {
    this.raw(`
      DROP FUNCTION IF EXISTS fp_refresh_v_specialties, fp_refresh_v_subspecialties, fp_refresh_v_positions;
  `);
  }
}

module.exports = AddRefreshFunctionToIndustryViewsSchema;
