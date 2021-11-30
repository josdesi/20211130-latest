'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')
const Database = use('Database');


class ContactIdxsSchema extends Schema {
  up () {
    this.schedule(async (transaction) => {
// --city company country full_name industry_specialty location state zip
      const columnsToDropIndexIndexes = ['country', 'state',  'city', 'zip', 'location', 'industry_specialty', 'full_name'];

      const finalQuery = columnsToDropIndexIndexes.map(column_name => `
        drop index if exists idx_${column_name}_contacts_directory_desc_nulls_first;
        drop index if exists idx_${column_name}_contacts_directory_asc_nulls_first;
      `).join('\n');

      try {
        await Database.raw(finalQuery).transacting(transaction);
        await transaction.commit();
      } catch(error) {
        await transaction.rollback();
        throw error;
      }
    });
  }

  down () {
   
  }
}

module.exports = ContactIdxsSchema
