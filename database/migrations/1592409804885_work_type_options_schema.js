'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class WorkTypeOptionsSchema extends Schema {
  up () {
    this.create('work_type_options', (table) => {
      table.integer('id').unsigned().primary()
      table.string('title', 255).notNullable()
      table.timestamps()
    })
  }

  down () {
    this.drop('work_type_options')
  }
}

module.exports = WorkTypeOptionsSchema
