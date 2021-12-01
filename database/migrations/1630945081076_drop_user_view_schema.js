'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')
const Database = use('Database')

class DropUserViewSchema extends Schema {
  up () {
    this.schedule(async (transaction) => {
      const dropView = 'DROP MATERIALIZED VIEW v_users;'
      try {
        await Database.raw(dropView).transacting(transaction);
        await transaction.commit();
      } catch(error) {
        await transaction.rollback();
        throw error;
      }
    });
  }
}

module.exports = DropUserViewSchema
