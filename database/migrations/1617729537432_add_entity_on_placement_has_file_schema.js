'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')
//This field will be used to not reupload files and only make logic copies if the user selects an existing file
//The url will be used to know if the file was used from another entity
class AddEntityOnPlacementHasFileSchema extends Schema {
  up () {
    this.table('placement_has_files', (table) => {
      // alter table
      table.string('entity');
    })
  }

  down () {
    this.table('placement_has_files', (table) => {
      // reverse alternations
      table.string('entity');
    })
  }
}

module.exports = AddEntityOnPlacementHasFileSchema
