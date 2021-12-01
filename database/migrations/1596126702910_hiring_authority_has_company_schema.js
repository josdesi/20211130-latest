'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class HiringAuthorityHasCompanySchema extends Schema {
  up () {
    this.create('hiring_authority_has_companies', (table) => {
      table.increments()
      table.integer('hiring_authority_id')
        .references('id')
        .inTable('hiring_authorities');
      table.integer('company_id')
        .references('id')
        .inTable('companies');
      table.timestamps()

      //Unique constraint  (Company, Hiring Authority)
      const addUnique = `
        ALTER TABLE hiring_authority_has_companies
        ADD CONSTRAINT unique_company_hiring_authority
        UNIQUE (company_id, hiring_authority_id)
      `
      this.raw(addUnique)
    })
  }

  down () {
    this.drop('hiring_authority_has_companies')
  }
}

module.exports = HiringAuthorityHasCompanySchema
