'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')
const Database = use('Database');
class ZipCodesSchema extends Schema {
  up () {
    this.schedule(async (transaction) => {
      try {
        await Database.raw('CREATE INDEX idx_zips_zip_ch ON zip_codes(zip_ch)').transacting(transaction);
        await transaction.commit();
      } catch(error) {
        await transaction.rollback();
        throw error;
      }
    })
  }

  down () {
    this.table('zip_codes', (table) => {
      // reverse alternations
    })
  }
}

module.exports = ZipCodesSchema
