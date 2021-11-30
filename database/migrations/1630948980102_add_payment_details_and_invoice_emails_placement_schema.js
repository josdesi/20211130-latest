'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class AddPaymentDetailsAndInvoiceEmailsPlacementSchema extends Schema {
  up () {
    this.table('placements', (table) => {
      // alter table
      table.specificType('additional_invoice_recipients', 'character varying[]');
      table.text('payment_details');
    })
  }

  down () {
    this.table('placements', (table) => {
      // reverse alternations
      table.dropColumn('additional_invoice_recipients');
      table.dropColumn('payment_details');
    })
  }
}

module.exports = AddPaymentDetailsAndInvoiceEmailsPlacementSchema
