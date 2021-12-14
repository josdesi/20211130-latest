'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');
const Database = use('Database');

class NameSchema extends Schema {
  up() {
    this.table('names', (table) => {
      // alter table
      table.boolean('pcr_record_changed').defaultTo(false);
      table.boolean('pcr_record').defaultTo(false);
      table.dropColumn('original_name_id');
    });
    this.schedule(async (transaction) => {
      await Database.raw(`ALTER TABLE names ADD CONSTRAINT names_email_unique UNIQUE (email);`).transacting(transaction);
      await Database.raw(`ALTER TABLE names ALTER COLUMN email SET NOT NULL;`).transacting(transaction);
    })
  }

  down() {
    this.table('names', (table) => {
      // reverse alternations
      table.dropColumn('pcr_record_changed');
      table.dropColumn('pcr_record');
      table.integer('original_name_id').references('id').inTable('names').unique();
    });
    this.schedule(async (transaction) => {
      await Database.raw(`ALTER TABLE names DROP CONSTRAINT names_email_unique;`).transacting(transaction);
      await Database.raw(`ALTER TABLE names ALTER COLUMN email DROP NOT NULL;`).transacting(transaction);
    })
  }
}

module.exports = NameSchema;
