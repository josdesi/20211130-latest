'use strict'
const { userStatus } = use('App/Helpers/Globals');

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')
const Database = use('Database');

class UserStatusSchema extends Schema {
  up () {
    this.schedule(async (trx) => {
      await Database.table('user_statuses').transacting(trx).insert([
        { id: userStatus.Absence, title: 'Absence' },
      ])
    });
  }

  down () {
  }
}

module.exports = UserStatusSchema
