'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class CandidatesSchema extends Schema {
  up () {
    this.table('candidates', (table) => {
      table.specificType('coordinates', 'GEOGRAPHY(POINT,4326)');
    })
  }

  down () {
    this.table('candidates', (table) => {
      table.dropColumn('coordinates');
    })
  }
}

module.exports = CandidatesSchema
