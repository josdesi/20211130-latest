'use strict'

const { Command } = require('@adonisjs/ace')
const Database = use('Database');
class PostMigrationDatabaseSetup extends Command {
  static get signature () {
    return `
      post:migration:database:setup
      { --user=@value: Name of the database user to grant}
    `
  }

  static get description () {
    return 'Things that must be set up after run database migrations'
  }

  async handle (args, options) {
    const { user } = options;
    if (!user) {
      this.error('--user option must be provided');
      return;
    }
    this.info('Granting access to database tables');
    const grantTables = `
      GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA core TO "${user}";
    `;
    await Database.raw(grantTables);

    this.info('Granting access to database squences');
    const grantSquences = `
      GRANT SELECT, USAGE ON ALL SEQUENCES IN SCHEMA core TO "${user}";
    `;
    await Database.raw(grantSquences);
    this.info('Granting access to custom functions and procedures');
    const grantFunctions = `
      GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA core TO "${user}";
    `;
    await Database.raw(grantFunctions);

    await Database.raw(`GRANT EXECUTE ON ALL PROCEDURES IN SCHEMA core TO "${user}";`);

    await Database.close();
  }

}

module.exports = PostMigrationDatabaseSetup
