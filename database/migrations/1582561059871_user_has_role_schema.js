'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');

class UserHasRoleSchema extends Schema {
  up() {
    this.create('user_has_roles', table => {
      table.increments();
      table
        .integer('role_id')
        .unsigned()
        .references('id')
        .on('roles');
      table
        .integer('user_id')
        .unsigned()
        .references('id')
        .on('users')
      table.timestamps();
    });
  }

  down() {
    this.drop('user_has_roles');
  }
}

module.exports = UserHasRoleSchema;
