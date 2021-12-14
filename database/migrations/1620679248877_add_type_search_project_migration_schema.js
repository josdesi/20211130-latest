'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');
const { migrationType } =  use('App/Helpers/Globals');
const Database = use('Database');

class AddTypeSearchProjectMigrationSchema extends Schema {
  up () {
    this.schedule(async(transaction) => {
      await Database.table('migration_types').insert(
        {
         id: migrationType.SearchProject,
         title: 'SearchProject'
        }).transacting(transaction);
    });
  }

  down () {
    this.schedule(async(transaction) => {
      await transaction.table('migration_types').where('id',migrationType.SearchProject).del();
    });
  }
}

module.exports = AddTypeSearchProjectMigrationSchema
