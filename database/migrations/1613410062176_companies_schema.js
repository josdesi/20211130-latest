'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')
const CompanyTypeSeeder = require('../seeds/CompanyTypeSeeder');
class CompaniesSchema extends Schema {
  up () {
    this.table('companies', (table) => {
      // alter table
    })

    this.schedule(async (transaction) => {
      try {
        const companyTypeSeeder = new CompanyTypeSeeder();
        await companyTypeSeeder.run(transaction);
        await transaction.commit();
      } catch(ex) {
        await transaction.rollback();
        throw ex;
      }
    })
  }

  down () {
    this.table('companies', (table) => {
      // reverse alternations
    })
  }
}

module.exports = CompaniesSchema
