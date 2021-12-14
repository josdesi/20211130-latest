'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')
class FeeAgreementStatusesSchema extends Schema {
  up () {
    this.table('fee_agreement_statuses', (table) => {
      table.specificType('hide_by_default_for_roles', 'integer[]');
    })
  }

  down () {
    this.table('fee_agreement_statuses', (table) => {
      table.dropColumn('hide_by_default_for_roles');
    })
  }
}

module.exports = FeeAgreementStatusesSchema
