'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')
const Database = use('Database');
class RolesSchema extends Schema {
  up () {
    this.schedule(async (transaction) => {
      const newRoles = [
        {id: 7, title: 'Data Coordinator'}
      ];
      await Database.table('roles').transacting(transaction).insert(newRoles);
    });
  }

  down () {
    this.schedule(async () => {
      await Database.table('roles').where('id',7).del();
    });
  }
}

module.exports = RolesSchema
