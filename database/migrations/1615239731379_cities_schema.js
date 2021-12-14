'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')
const Database = use('Database');
class CitiesSchema extends Schema {
  up () {
    this.table('cities', (table) => {
      
    })

    this.schedule(async (transaction) => {
      try {
        const formatUSAZipCodes = `
          UPDATE zip_codes set formatted_zip = lpad(zip_ch, 5, '0') WHERE state_id IN (SELECT id FROM states WHERE country_id = 1)
        `;
        const formatAllOthersZipCodes = `
          UPDATE zip_codes set formatted_zip = zip_ch WHERE state_id IN (SELECT id FROM states WHERE country_id != 1)
      `;
        await Database.raw(formatUSAZipCodes).transacting(transaction);
        await Database.raw(formatAllOthersZipCodes).transacting(transaction);
        await transaction.commit();
      } catch(error) {
        await transaction.rollback();
        throw error;
      }
    });
  }

  down () {
    this.table('cities', (table) => {
      // reverse alternations
    })
  }
}

module.exports = CitiesSchema
