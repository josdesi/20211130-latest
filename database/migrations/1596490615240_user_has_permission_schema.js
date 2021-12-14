'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class UserHasPermissionSchema extends Schema {
  up () {
    this.create('user_has_permissions', (table) => {
      table.increments()
      table.integer('permission_id')
        .references('id')
        .inTable('permissions');
      table.integer('user_id')
        .references('id')
        .inTable('users');
      table.timestamps()
    })
  }

  down () {
    this.drop('user_has_permissions')
  }
}

module.exports = UserHasPermissionSchema
