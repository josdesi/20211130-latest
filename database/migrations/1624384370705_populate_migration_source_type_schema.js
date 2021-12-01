'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')
const { sourceTypes } = use('App/Helpers/Migration/Constants');
const Database = use('Database');

class PopulateMigrationSourceTypeSchema extends Schema {
  up () {
    this.schedule(async (transaction) => {
      await transaction.table('migration_source_types')
        .insert(Object.keys(sourceTypes).map((property) => {
          return {
            id: sourceTypes[property].id,
            title: sourceTypes[property].title
          }
        }));
    });
  }

  down () {
    Database.truncate('migration_source_types')
  }
}

module.exports = PopulateMigrationSourceTypeSchema
