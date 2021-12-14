'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');

class MicrosoftGraphTokenSchema extends Schema {
  up() {
    this.create('microsoft_graph_tokens', (table) => {
      table.increments();
      table.integer('user_id').unsigned().references('id').inTable('users');
      table.text('token');
      table.text('refresh_token');
      table.timestamp('expires_on');
      table.timestamps();
    });
  }

  down() {
    this.drop('microsoft_graph_tokens');
  }
}

module.exports = MicrosoftGraphTokenSchema;
