'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')
const FileTypeSeeder = require('../seeds/FileTypeSeeder');

class UpdateFileTypeSchema extends Schema {
  up () {
    this.schedule(async (transaction) => {
      const fileTypeSeeder = new FileTypeSeeder();
      try {
        await fileTypeSeeder.run(transaction);
        await transaction.commit();
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    });
  }

  down () {
    // reverse alternations
  }
}

module.exports = UpdateFileTypeSchema
