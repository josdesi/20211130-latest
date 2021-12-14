'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')
const Database = use('Database')

class RoleSchema extends Schema {
  up () {
    this.schedule(async (trx) => {
      await Database.table('roles').transacting(trx).insert([
        { id: 4, title: 'Regional Director' }
      ])
    })
  }

  down () {
    this.schedule(async (trx) => {
      await Database.table('roles').transacting(trx).where('title','Regional Director').del()
    })
  }
}

module.exports = RoleSchema
