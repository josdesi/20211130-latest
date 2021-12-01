'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class PersonalInformationsSchema extends Schema {
  up () {
    this.table('personal_informations', (table) => {
      table.string('first_name', 128).notNullable().alter();
      table.string('last_name', 128).notNullable().alter();
      table.string('full_name', 256).notNullable().alter();
    })
  }

  down () {
    this.table('personal_informations', (table) => {
      table.string('first_name', 45).notNullable().alter();
      table.string('last_name', 45).notNullable().alter();
      table.string('full_name', 128).notNullable().alter();
    })
  }
}

module.exports = PersonalInformationsSchema
