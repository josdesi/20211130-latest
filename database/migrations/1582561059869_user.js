'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');

class UserSchema extends Schema {
  async up() {
    this.create('users', (table) => {
      table.increments();
      table
        .string('email', 64)
        .notNullable()
        .unique();
      table.string('initials',5)
      table.text('avatar');
      table.specificType('double_authentication', 'smallint').defaultTo(0);
      table.specificType('step_wizard', 'smallint').defaultTo(0);
      table.text('token_notification');
      table
        .integer('personal_information_id')
        .unsigned()
        .references('id')
        .inTable('personal_informations');
      table
        .integer('user_status_id')
        .unsigned()
        .references('id')
        .on('user_statuses');
      table.timestamps();
      table.integer('created_by');
      table.integer('updated_by');
    })
  }

  down() {
    this.drop('users')
  }
}

module.exports = UserSchema;
