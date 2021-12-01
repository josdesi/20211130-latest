'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

// Seeder
const SendoutStatusSeeder = require('../Seeds/SendoutStatusSeeder');

class SendoutStatusSchema extends Schema {
  up () {
    this.table('sendout_statuses', (table) => {
      // alter table
      table
      .integer('sendout_type_id')
      .unsigned()
      .references('id')
      .inTable('sendout_types');
    });

    this.schedule(async (transaction) => {
      try {
        await SendoutStatusSeeder.run(transaction);
        await transaction.commit();
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    });
  }

  down () {
    this.table('sendout_statuses', (table) => {
      // reverse alternations
      table.dropColumn('sendout_type_id');
    })
  }
}

module.exports = SendoutStatusSchema
