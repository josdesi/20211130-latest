'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');
const Database = use('Database');

class SendoutsSchema extends Schema {
  up() {
    this.table('sendouts', (table) => {
      table.dropColumn('recruiter_id');
    });
  }

  down() {
    this.table('sendouts', (table) => {
      // reverse alternations
      table.integer('recruiter_id').unsigned().references('id').inTable('users');

      this.schedule(async (trx) => {
        const query = `
          UPDATE sendouts
          SET recruiter_id = job_order_accountable_id
          WHERE recruiter_id IS NULL
        `;

        try {
          await Database.raw(query).transacting(trx);
          await trx.commit();
        } catch (error) {
          await trx.rollback();
          throw error;
        }
      });
    });
  }
}

module.exports = SendoutsSchema;
