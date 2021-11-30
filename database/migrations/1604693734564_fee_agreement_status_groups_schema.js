'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class FeeAgreementStatusGroupsSchema extends Schema {
  up () {
    this.create('fee_agreement_status_groups', (table) => {
      table.increments()
      table.string('title', 255);
      table.string('style_class_name', 255);
      table.timestamps()
    })
  }

  down () {
    this.drop('fee_agreement_status_groups')
  }
}

module.exports = FeeAgreementStatusGroupsSchema
