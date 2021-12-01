'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class SendgridEmailValidationSchema extends Schema {
  up () {
    this.table('sendgrid_email_validations', (table) => {
      // alter table
      table.string('source', 32);
    })
  }

  down () {
    this.table('sendgrid_email_validations', (table) => {
      // reverse alternations
      table.dropColumn('source')
    })
  }
}

module.exports = SendgridEmailValidationSchema
