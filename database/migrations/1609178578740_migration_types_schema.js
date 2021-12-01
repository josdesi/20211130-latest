'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')
const Database = use('Database')

class MigrationTypesSchema extends Schema {
  up () {
    this.create('migration_types', (table) => {
      table.increments()
      table
      .string('title', 25)
      .notNullable()
      .unique();
      table.timestamps()
    })

    this.schedule(async (trx) => {
      await Database.table('migration_types').transacting(trx).insert([
        { id: 0, title: 'Company' },
        { id: 1, title: 'Contact' }
      ])
    })
  }

  down () {
    this.drop('migration_types')
  }
}

module.exports = MigrationTypesSchema
