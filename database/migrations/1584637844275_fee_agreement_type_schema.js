'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class FeeAgreementTypeSchema extends Schema {
  up () {
    this.create('fee_agreement_types', (table) => {
      table.increments();
      table
        .string('title', 25)
        .notNullable()
        .unique();
      table.integer('created_by');
      table.integer('updated_by');
      table.timestamps();
    })
  }

  down () {
    this.drop('fee_agreement_types')
  }
}

module.exports = FeeAgreementTypeSchema
