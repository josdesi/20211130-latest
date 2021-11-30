'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');
const Database = use('Database');

class CompanySchema extends Schema {
  up() {
    this.schedule(async (transaction) => {
      const query = `CREATE INDEX companies_name_trgm_idx ON companies USING gin (name gin_trgm_ops);`;
      try {
        await Database.raw(query).transacting(transaction);
        await transaction.commit();
      } catch (ex) {
        await transaction.rollback();
        throw ex;
      }
    });
  }

  down() {
    this.schedule(async (transaction) => {
      const query = `DROP INDEX companies_name_trgm_idx`;
      try {
        await Database.raw(query).transacting(transaction);
        await transaction.commit();
      } catch (ex) {
        await transaction.rollback();
        throw ex;
      }
    });
  }
}

module.exports = CompanySchema;
