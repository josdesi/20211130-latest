'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class HolidaysSchema extends Schema {
  up () {
    this.create('holidays', (table) => {
      table.increments()
      table.date('date')
      table.string('title', 254)
      table.timestamps()
    })
  }

  down () {
    this.drop('holidays')
  }
}

module.exports = HolidaysSchema
