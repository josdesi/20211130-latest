'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')
const Database = use('Database');
const { types } = use('App/Helpers/FileType');

class UpdateRequiredForPlacementFilesSchema extends Schema {
  up () {
    this.schedule(async (transaction) => {
      const migrateRelationToNewTable = `
        UPDATE file_types
        SET required=true
        WHERE module='placement' 
        AND id != ?;
      `
      await Database.raw(migrateRelationToNewTable,[types.OFFER_LETTER._id]).transacting(transaction)
    })
  }

  down () {
  }
}

module.exports = UpdateRequiredForPlacementFilesSchema
