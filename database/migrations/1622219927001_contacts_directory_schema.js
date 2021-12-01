'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');
const Database = use('Database');

class ContactsSchema extends Schema {
  up() {
    this.schedule(async (transaction) => {
      const createIndexes = `
        CREATE INDEX IF NOT EXISTS idx_contacts_company_type_id
            ON contacts_directory USING btree
            (company_type_id ASC NULLS LAST);
      `;
      try {
        await Database.raw(createIndexes).transacting(transaction);
        await transaction.commit();
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    });
  }

  down() {}
}

module.exports = ContactsSchema;
