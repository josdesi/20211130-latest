'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class ContactsSchema extends Schema {
  up () {
   this.raw(`CREATE INDEX idx_contacts_lower_case_personal_email ON contacts (lower(personal_email))`);
  }

  down () {
    this.raw(`DROP INDEX idx_contacts_lower_case_personal_email`);
  }
}

module.exports = ContactsSchema
