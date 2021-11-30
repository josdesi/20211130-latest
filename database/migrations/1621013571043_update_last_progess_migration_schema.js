'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class UpdateLastProgessMigrationSchema extends Schema {
  up () {
    this.raw(
      `
        UPDATE migrations 
        SET last_progress = sq.progress
        FROM
        (
          select migration_id, max(progress) as progress from migration_logs group by migration_id
        ) AS sq WHERE migrations.id = sq.migration_id
      `
    )
  }

  down () {
  }
}

module.exports = UpdateLastProgessMigrationSchema
