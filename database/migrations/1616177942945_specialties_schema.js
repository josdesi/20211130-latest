'use strict'
/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')
const Database = use('Database');
class SpecialtiesSchema extends Schema {
  up () {
    this.table('specialties', (table) => {
      // alter table
    })

    this.schedule(async (transaction) => {
      const dropIfExists = `drop materialized view if exists v_positions`;
      const createViewAgain = `
      create materialized view v_positions as 
       SELECT DISTINCT ON (lower(pos.title)) pos.title,
          pos.id,
          pos.industry_id,
          pos.specialty_id,
          ind.title AS industry,
          spec.title AS specialty,
          to_tsvector('simple'::regconfig, concat(pos.title)) AS document_tokens,
          ( SELECT array_agg(data.id) AS array_agg
                 FROM ( SELECT positions.id
                         FROM positions
                        WHERE positions.title = pos.title) data) AS related_position_ids
         FROM positions pos
           JOIN industries ind ON ind.id = pos.industry_id
           JOIN specialties spec ON spec.id = pos.specialty_id;`
      try {
        await Database.raw(dropIfExists).transacting(transaction);
        await Database.raw(createViewAgain).transacting(transaction);
      } catch(error) {
        await transaction.rollback();
        throw error;
      }
    });
  }

  down () {
    this.table('specialties', (table) => {
      // reverse alternations
    })
  }
}

module.exports = SpecialtiesSchema
