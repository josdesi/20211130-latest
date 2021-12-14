'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')
const Database = use('Database');
const {userPermissions, userRoles} = use('App/Helpers/Globals');
class UsersSchema extends Schema {
  up () {
    this.table('users', (table) => {
      // alter table
    })

    this.schedule(async (transaction) => {
      const query = `
      INSERT INTO user_has_permissions (user_id, permission_id)
      SELECT distinct(user_id) ,${userPermissions.inventory.overrideAssignment}  FROM user_has_roles WHERE role_id IN (${userRoles.Operations}, ${userRoles.DataCoordinator})
      `;
      try {
        await Database.raw(query).transacting(transaction);
        await transaction.commit();
      } catch(ex) {
        await transaction.rollback();
        throw ex;
      }
    });
  }

  down () {
    this.table('users', (table) => {
      // reverse alternations
    })
  }
}

module.exports = UsersSchema
