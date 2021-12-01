'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class FeeAgreementStatusesSchema extends Schema {
  up () {
    this.create('fee_agreement_statuses', (table) => {
      table.increments()
      table.integer('responsible_role_id')
        .references('id')
        .inTable('roles');
      table.integer('status_group_id')
        .references('id')
        .inTable('fee_agreement_status_groups');
      table.specificType('roles_that_can_watch', 'integer[]');
      table.string('title', 255);
      table.string('internal_name', 255);
      table.string('style_class_name', 255);
      table.timestamps()
    })
  }

  down () {
    this.drop('fee_agreement_statuses')
  }
}

module.exports = FeeAgreementStatusesSchema
