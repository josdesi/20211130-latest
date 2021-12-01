'use strict'

const { create } = require('lodash');

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class FeeAgreementPaymentSchemesSchema extends Schema {
  up () {
    this.create('fee_agreement_payment_schemes', (table) => {
      table.string('id', 20).primary();
      table.string('title', 255);
      table.timestamps();
    })
  }

  down () {
    this.drop('fee_agreement_payment_schemes')
  }
}

module.exports = FeeAgreementPaymentSchemesSchema
