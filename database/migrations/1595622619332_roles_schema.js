'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')
const Database = use('Database');
class RolesSchema extends Schema {
  up () {
    this.schedule(async (transaction) => {
      const newRoles = [
        {id: 5, title: 'Production Director'},
        {id: 6, title: 'Operations'}
      ];
      await Database.table('roles').transacting(transaction).insert(newRoles);
    });
  }

  down () {
    this.table('roles', (table) => {
      // reverse alternations
    })
  }
}

module.exports = RolesSchema
