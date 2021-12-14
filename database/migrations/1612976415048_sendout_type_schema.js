'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

// Seeder
const SendoutTypeSeeder = require('../Seeds/SendoutTypeSeeder');

class SendoutTypeSchema extends Schema {
  up () {
    this.create('sendout_types', (table) => {
      table.increments();
      table
        .string('title', 50)
        .notNullable()
        .unique();
      table.timestamps();
      table.integer('created_by');
      table.integer('updated_by');
    });

    this.schedule(async (transaction) => {
      try {
        await SendoutTypeSeeder.run(transaction);
        await transaction.commit();
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    });
  }

  down () {
    this.drop('sendout_types')
  }
}

module.exports = SendoutTypeSchema
