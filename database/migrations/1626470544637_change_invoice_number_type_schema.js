'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class ChangeInvoiceNumberTypeSchema extends Schema {
  up () {
    this.table('placement_invoices', (table) => {
      // alter table
      //Number is refered to No.# so in some future could contain letters as well;
      table.string('number').alter()
    })
  }

  down () {
    this.table('placement_invoices', (table) => {
      // reverse alternations
      table.string('integer').alter()
    })
  }
}

module.exports = ChangeInvoiceNumberTypeSchema
