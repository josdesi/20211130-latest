'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')
const Database = use('Database');

class HiringAuthoritiesIdxSchema extends Schema {
  up () {
    this.schedule(async (transaction) => {
      const createIndexes = `
        CREATE INDEX IF NOT EXISTS hiring_authorities_full_name_or_email_idx
            ON hiring_authorities USING btree
            (lower(full_name::text) COLLATE pg_catalog."default" varchar_pattern_ops ASC NULLS LAST, lower(work_email::text) COLLATE pg_catalog."default" varchar_pattern_ops ASC NULLS LAST);
      `;
      try {
        await Database.raw(createIndexes).transacting(transaction);
        await transaction.commit();
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    });
  }

  down () {
    
  }
}

module.exports = HiringAuthoritiesIdxSchema
