'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class ZipCodesSchema extends Schema {
  up () {
    this.table('zip_codes', (table) => {
      table.string('formatted_zip', 10);
    })
  }

  down () {
    this.table('zip_codes', (table) => {
      table.dropColumn('formatted_zip');
    })
  }
}

module.exports = ZipCodesSchema
