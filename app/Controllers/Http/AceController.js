'use strict';

/** @typedef {import('@adonisjs/framework/src/Request')} Request */
/** @typedef {import('@adonisjs/framework/src/Response')} Response */

const ace = require('@adonisjs/ace');
const appInsights = require('applicationinsights');
const PostMigrationDatabaseSetup = use('App/Commands/PostMigrationDatabaseSetup');
const Config = use('Adonis/Src/Config');;
class AceController {

  async migrationsStatus({ request, response }) {
    try {
      await ace.call('migration:status', {}, {});
      return response.ok('Completed');
    } catch(error) {
      appInsights.defaultClient.trackException({ exception: error });

      response.status(500).send(error);
    }
  }

  async migrationsRun({ request, response }) {
    try {
      await ace.call('migration:run', {}, { force: true });
      return response.ok('Completed');
    } catch(error) {
      appInsights.defaultClient.trackException({ exception: error });

      return response.status(500).send(error);
    }
  }

  async postDbSetup({ response }) {
    try {
      const postMigrationDatabaseSetup = new PostMigrationDatabaseSetup();
      const user = Config.get('postMigrationConfig.apiUser');
      await postMigrationDatabaseSetup.handle({user}, {user});
      return response.ok('Completed');
    } catch(error) {
      appInsights.defaultClient.trackException({ exception: error });
      return response.status(500).send(error);
    }
  }
}

module.exports = AceController;
