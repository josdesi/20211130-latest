'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')
const Database = use('Database')

class CompanyTypeSchema extends Schema {
  up () {
    this.create('company_types', (table) => {
      table.increments()
      table
        .string('title', 25)
        .notNullable()
        .unique();
      table.timestamps()
    });

    // copy data
    this.schedule(async (trx) => {
      await Database.table('company_types').transacting(trx).insert([
        { id: 0, title: 'Signed' },
        { id: 1, title: 'Client' }
      ])
    })
  }

  down () {
    this.drop('company_types')
  }
}

module.exports = CompanyTypeSchema
