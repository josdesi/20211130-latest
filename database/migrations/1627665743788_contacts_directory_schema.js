'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');
const Database = use('Database')

class ContactsDirectorySchema extends Schema {
  up() {
    this.schedule(async (transaction) => {
      const createIndexes = `
        CREATE INDEX IF NOT EXISTS idx_contacts_recruiter_id
            ON contacts_directory USING btree
            (recruiter_id ASC NULLS LAST);
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

module.exports = ContactsDirectorySchema;
