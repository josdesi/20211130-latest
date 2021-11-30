'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');

class EmailTemplateHasBulkScopeSchema extends Schema {
  up() {
    // alter table
    this.drop('email_template_has_bulk_scopes');
  }

  down() {
    // reverse alternations
  }
}

module.exports = EmailTemplateHasBulkScopeSchema;
