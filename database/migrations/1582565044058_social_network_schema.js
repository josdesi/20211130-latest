'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');

class SocialNetworkSchema extends Schema {
  up() {
    this.create('social_networks', table => {
      table.increments();
      table
        .string('title', 50)
        .notNullable()
        .unique();
      table.timestamps();
      table.integer('created_by');
      table.integer('updated_by');
    });
  }

  down() {
    this.drop('social_networks');
  }
}

module.exports = SocialNetworkSchema;
