'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class UserHasTempFilesSchema extends Schema {
  up () {
    this.table('user_has_temp_files', (table) => {
      table.string('mimetype', 100);
      table.bigInteger('size_in_bytes');
    })
  }

  down () {
    this.table('user_has_temp_files', (table) => {
      table.string('mimetype');
      table.bigInteger('size_in_bytes');
    })
  }
}

module.exports = UserHasTempFilesSchema
