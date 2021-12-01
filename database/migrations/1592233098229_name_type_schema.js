'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')
const Database = use('Database')

class NameTypeSchema extends Schema {
  up () {
    this.create('name_types', (table) => {
      table.increments()
      table
        .string('title', 25)
        .notNullable()
        .unique();
      table.timestamps()
    })

    // copy data
    this.schedule(async (trx) => {
      await Database.table('name_types').transacting(trx).insert([
        { id: 0, title: 'Name' },
        { id: 1, title: 'Candidate' },
        { id: 2, title: 'Hiring Authority' }
      ])
    })
  }

  down () {
    this.drop('name_types')
  }
}

module.exports = NameTypeSchema
