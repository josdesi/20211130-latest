'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class EmailTemplateFolderSchema extends Schema {
  up () {
    this.table('email_template_folders', (table) => {
      // alter table
      table.boolean('is_system_folder').defaultTo(false);
      table.boolean('is_default_folder').defaultTo(false);

    })
  }

  down () {
    this.table('email_template_folders', (table) => {
      // reverse alternations
      table.dropColumn('is_system_folder');
      table.dropColumn('is_default_folder');

    })
  }
}

module.exports = EmailTemplateFolderSchema
