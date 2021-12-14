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
      const createViewQuery = `
      create materialized view v_subspecialties as
      select
        sub.id as id,
        sub.specialty_id  as specialty_id,
        ind.id as industry_id,
        sub.title as title,
        spec.title as specialty,
        ind.title as industry,
        to_tsvector('simple', concat(sub.title, ' ', spec.title, ' ', ind.title)) as document_tokens 
      from subspecialties sub
      join specialties spec on spec.id = sub.specialty_id 
      join industries ind on ind.id = spec.industry_id`;

      const specialtyIndex = 'create index on v_subspecialties(specialty_id)';
      const industryIndex = 'create index on v_subspecialties(industry_id)';
      
      try {
        await Database.raw(createViewQuery).transacting(transaction);
        await Database.raw(specialtyIndex).transacting(transaction);
        await Database.raw(industryIndex).transacting(transaction);
        await transaction.commit();
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
