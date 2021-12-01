'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')
const Database = use('Database');

class AddFinanceRoleSchema extends Schema {
  up () {
    this.schedule(async (transaction) => {
      await Database.table('roles').transacting(transaction).insert({ id: 8,  title: 'Finance' });
    });
  }

  down () {
    this.schedule(async (transaction) => {
      await transaction.table('roles').where('id', 8).del();
    });
  }
}

module.exports = AddFinanceRoleSchema
