'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class EmailTemplateHasBulkScopeSchema extends Schema {
  up () {
    this.create('email_template_has_bulk_scopes', (table) => {
      table.increments()
      table.integer('email_template_id').unsigned().references('id').inTable('email_templates');
      table.integer('bulk_email_scope_type_id').unsigned().references('id').inTable('bulk_email_scope_types');
      table.timestamps()
    })
  }

  down () {
    this.drop('email_template_has_bulk_scopes')
  }
}

module.exports = EmailTemplateHasBulkScopeSchema
