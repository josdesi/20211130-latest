'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class ElectronicSignatureProvidersSchema extends Schema {
  up () {
    this.create('electronic_signature_providers', (table) => {
      table.string('id').primary();
      table.string('title', 256);
      table.timestamps()
    })
  }

  down () {
    this.drop('electronic_signature_providers')
  }
}

module.exports = ElectronicSignatureProvidersSchema
