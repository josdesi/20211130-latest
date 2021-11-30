'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');
const Database = use('Database');

class MigrationFkIndexingSchema extends Schema {
  up() {
    this.schedule(async (transaction) => {
      const createSPMigrationIdIndex =
        'CREATE INDEX IF NOT EXISTS idx_search_project_migration_id ON search_projects (migration_id);';
      const createHAMigrationIdIndex =
        'CREATE INDEX IF NOT EXISTS idx_hiring_authority_migration_id ON hiring_authorities (migration_id);';
      const createNameMigrationIdIndex =
        'CREATE INDEX IF NOT EXISTS idx_name_migration_id ON names (migration_id);';
      const createCompaniesMigrationIdIndex =
        'CREATE INDEX IF NOT EXISTS idx_company_migration_id ON companies (migration_id);';

      await Database.raw(createSPMigrationIdIndex).transacting(transaction);
      await Database.raw(createHAMigrationIdIndex).transacting(transaction);
      await Database.raw(createNameMigrationIdIndex).transacting(transaction);
      await Database.raw(createCompaniesMigrationIdIndex).transacting(transaction);
    });
  }

  down() {}
}

module.exports = MigrationFkIndexingSchema;
