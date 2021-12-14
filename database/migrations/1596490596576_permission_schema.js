'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')
const Database = use('Database');

class PermissionSchema extends Schema {
  up () {
    this.create('permissions', (table) => {
      table.increments()
      table.string('title', 255).notNullable()
      table.timestamps()
    })

    this.schedule(async (transaction) => {
      await Database.table('permissions')
        .transacting(transaction)
        .insert([
          {id: 1, title: 'feeAgreements.modifyGuarantee'},
          {id: 2, title: 'feeAgreements.modifyPercentage'}
        ]);
    });
  }

  down () {
    this.drop('permissions')
  }
}

module.exports = PermissionSchema
