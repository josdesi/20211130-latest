'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class CompanyFeeAgreementsSchema extends Schema {
  up () {
    this.table('company_fee_agreements', (table) => {
      table.integer('appropiator_id').references('id').inTable('users');
      table.integer('appropiator_role_id').references('id').inTable('roles');
    })
  }

  down () {
    this.table('company_fee_agreements', (table) => {
      table.dropTable('appropiator_id');
      table.dropTable('appropiator_role_id');
    })
  }
}

module.exports = CompanyFeeAgreementsSchema
