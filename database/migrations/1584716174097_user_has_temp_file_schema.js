'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class UserHasTempFileSchema extends Schema {
  up () {
    this.create('user_has_temp_files', (table) => {
      table.increments()
      table
        .integer('user_id')
        .unsigned()
        .references('id')
        .on('users')
      table.text('url').notNullable();
      table.string('file_name',254)
      table.string('original_name',254)
      table.timestamps()
    })
  }

  down () {
    this.drop('user_has_temp_files')
  }
}

module.exports = UserHasTempFileSchema
