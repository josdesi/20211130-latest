'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class ZipCodesSchema extends Schema {
  up () {
    this.table('zip_codes', (table) => {
      // alter table
      this.raw('ALTER TABLE zip_codes DROP CONSTRAINT zip_codes_zip_unique')
      //Add unique constraint for combination (zip, city_id,state_id)
      const addUnique = `
        ALTER TABLE zip_codes
        ADD CONSTRAINT unique_zip_code_city_state
        UNIQUE (zip, city_id, state_id)
      `
      this.raw(addUnique)
})
  }

  down () {
    this.table('zip_codes', (table) => {
      // reverse alternations
      this.raw('ALTER TABLE zip_codes DROP CONSTRAINT unique_zip_code_city_state')
      this.raw('ALTER TABLE zip_codes ADD CONSTRAINT zip_codes_zip_uniqueUNIQUE (zip)')
    })
  }
}

module.exports = ZipCodesSchema
