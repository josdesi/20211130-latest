'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')
const NameDirectoryUpdater = new (use('App/Helpers/NameDirectoryUpdater'))();
const CandidateDirectoryUpdater = new (use('App/Helpers/CandidateDirectoryUpdater'))();
const HiringAuthorityDirectoryUpdater = new (use('App/Helpers/HiringAuthorityDirectoryUpdater'))();
class NameTypesSchema extends Schema {
  up () {
    this.schedule(async (transaction) => {
      try {
        await NameDirectoryUpdater.synchronizeAllUnSynchronized(transaction); console.log('A');
        await CandidateDirectoryUpdater.synchronizeAllUnSynchronized(transaction); console.log('B');
        await HiringAuthorityDirectoryUpdater.synchronizeAllUnSynchronized(transaction); console.log('C');
        await transaction.commit();
      } catch(error) {
        await transaction.rollback();
        throw error;
      }
    });
  }

  down () {
    this.table('name_types', (table) => {
      // reverse alternations
    })
  }
}

module.exports = NameTypesSchema
