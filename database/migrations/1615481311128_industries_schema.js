'use strict'
const Database = use('Database');
/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class IndustriesSchema extends Schema {
  up () {
    this.table('industries', (table) => {
      // alter table
    })

    this.schedule(async (transaction) => {
      const dropView = 'drop materialized view v_specialties;'
      const createViewAgain = `
      create materialized view v_specialties as
      SELECT spec.id,
        spec.title AS title,
        ind.id AS industry_id,
        ind.title AS industry,
        to_tsvector('simple', concat(spec.title, ' ', ind.title)) as document_tokens 
        FROM specialties spec
          JOIN industries ind ON ind.id = spec.industry_id
      ORDER BY ind.id, spec.id;`;
      try {
        await Database.raw(dropView).transacting(transaction);
        await Database.raw(createViewAgain).transacting(transaction);
        await transaction.commit();
      } catch(error) {
        await transaction.rollback();
        throw error;
      }
    });
  }

  down () {
    this.table('industries', (table) => {
      // reverse alternations
    })
  }
}

module.exports = IndustriesSchema
