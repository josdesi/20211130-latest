'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')
const BulkTemplateUserFolderSeeder = require('../Seeds/BulkTemplateUserFolderSeeder');


class EmailTemplateFolderSchema extends Schema {
  up() {
    this.schedule(async (transaction) => {
      try {
        await BulkTemplateUserFolderSeeder.run(transaction);
        await transaction.commit();
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    });
  }

  down () {
    this.table('email_template_folders', (table) => {
      // reverse alternations
    })
  }
}

module.exports = EmailTemplateFolderSchema
