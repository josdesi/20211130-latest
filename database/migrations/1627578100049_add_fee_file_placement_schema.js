'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')
const FileTypeSeeder = require('../seeds/FileTypeSeeder');
const { types } = use('App/Helpers/FileType');

class AddFeeFilePlacementSchema extends Schema {
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
    this.schedule(async (transaction) => {
      await transaction.table('file_types')
        .where('id', types.PlACEMENT_FEE._id)
        .delete();
    });
  }
}

module.exports = AddFeeFilePlacementSchema
