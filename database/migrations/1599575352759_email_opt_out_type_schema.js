'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');
const Database = use('Database');

class EmailOptOutTypeSchema extends Schema {
  up() {
    this.create('email_opt_out_types', (table) => {
      table.increments();
      table.string('title', 50).notNullable();
      table.timestamps();
    });

    this.schedule(async (transaction) => {
      await Database.table('email_opt_out_types')
        .transacting(transaction)
        .insert([{ title: 'Candidate' }, { title: 'Hiring Authority' }, { title: 'Names' }]);
    });
  }

  down() {
    this.drop('email_opt_out_types');
  }
}

module.exports = EmailOptOutTypeSchema;
