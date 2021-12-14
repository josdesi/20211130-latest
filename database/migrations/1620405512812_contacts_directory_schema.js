'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')
const Database = use('Database');
class ContactsDirectorySchema extends Schema {
  up () {
    this.schedule(async (transaction) => {

      const columnsToCreateTextSortIndexes = ['country', 'state',  'city', 'zip', 'location', 'industry_specialty'];

      const finalQuery = columnsToCreateTextSortIndexes.map(column_name => `
        create index idx_${column_name}_contacts_directory_desc_nulls_last on contacts_directory(${column_name} desc nulls last);
        create index idx_${column_name}_contacts_directory_desc_nulls_first on contacts_directory(${column_name} desc nulls first);
        create index idx_${column_name}_contacts_directory_asc_nulls_last on contacts_directory(${column_name} asc nulls last);
        create index idx_${column_name}_contacts_directory_asc_nulls_first on contacts_directory(${column_name} asc nulls first);
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
    this.table('contacts_directories', (table) => {
      // reverse alternations
    })
  }
}

module.exports = ContactsDirectorySchema
