'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

// Seeder
const SendoutTemplateSeeder = require('../Seeds/SendoutTemplateSeeder');

class SendoutTemplateSchema extends Schema {
  up () {
    this.create('sendout_templates', (table) => {
      table.increments()
      table.string('subject', 254);
      table.text('text');
      table.text('html');
      table.timestamps()
      table.integer('created_by');
      table.integer('updated_by');
    });

    this.schedule(async (transaction) => {
      try {
        await SendoutTemplateSeeder.run(transaction);
        await transaction.commit();
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    });
  }

  down () {
    this.drop('sendout_templates')
  }
}

module.exports = SendoutTemplateSchema
