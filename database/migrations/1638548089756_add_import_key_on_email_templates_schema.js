'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class AddImportKeyOnEmailTemplatesSchema extends Schema {
  up () {
    this.table('email_templates', (table) => {
      table.string('import_id', 128);
    })
  }

  down () {
    this.table('email_templates', (table) => {
      table.dropColumn('import_id');
    })
  }
}

module.exports = AddImportKeyOnEmailTemplatesSchema
