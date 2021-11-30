'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');

class MicrosoftGraphSubscriptionSchema extends Schema {
  up() {
    this.create('microsoft_graph_subscriptions', (table) => {
      table.increments();
      table.integer('user_id').unsigned().references('id').inTable('users');
      table.text('subscription_id');
      table.timestamp('expires_on');
      table.timestamps();
    });
  }

  down() {
    this.drop('microsoft_graph_subscriptions');
  }
}

module.exports = MicrosoftGraphSubscriptionSchema;
