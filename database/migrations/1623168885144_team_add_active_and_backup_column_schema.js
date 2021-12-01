'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class TeamAddActiveAndBackupColumnSchema extends Schema {
  up () {
    this.table('teams', (table) => {
      // alter table
      table.boolean('active').defaultTo(true);
      table.integer('backup_coach_id').references('id').inTable('users');//For Cases when a coach leaves ,the team his items should be transfer.
    })
  }

  down () {
    this.table('teams', (table) => {
      // reverse alternations
      table.dropColumn('active');
      table.dropColumn('backup_coach_id');
    })
  }
}

module.exports = TeamAddActiveAndBackupColumnSchema
