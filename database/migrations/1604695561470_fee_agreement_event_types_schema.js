'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class FeeAgreementEventTypesSchema extends Schema {
  up () {
    this.create('fee_agreement_event_types', (table) => {
      table.increments()
      table.string('name', 255);
      table.timestamps()
    })
  }

  down () {
    this.drop('fee_agreement_event_types')
  }
}

module.exports = FeeAgreementEventTypesSchema
