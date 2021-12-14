'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class EmailTemplateFolderSchema extends Schema {
  up () {
    this.create('email_template_folders', (table) => {
      table.increments()
      table.integer('created_by').unsigned().references('id').inTable('users');
      table.boolean('is_private').defaultTo(true);
      table.string('name', 254).notNullable();
      table.integer('parent_folder_id').unsigned().references('id').inTable('email_template_folders');
      table.timestamps()
    })
  }

  down () {
    this.drop('email_template_folders')
  }
}

module.exports = EmailTemplateFolderSchema
