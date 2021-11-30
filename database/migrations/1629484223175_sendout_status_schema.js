'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')
const Database = use('Database');

class SendoutStatusSchema extends Schema {
  up () {
    this.schedule(async (transaction) => {
      await Database.raw(`ALTER TABLE sendout_statuses DROP CONSTRAINT if exists sendout_statuses_title_unique;`).transacting(transaction);
      await Database.raw(`ALTER TABLE sendout_statuses DROP CONSTRAINT if exists sendout_statuses_style_unique;`).transacting(transaction);
    })
  }

  down () {
    this.schedule(async (transaction) => {
      await Database.raw(`ALTER TABLE sendout_statuses ADD CONSTRAINT sendout_statuses_title_unique UNIQUE (title);`).transacting(transaction);
      await Database.raw(`ALTER TABLE sendout_statuses ADD CONSTRAINT sendout_statuses_style_unique UNIQUE (style);`).transacting(transaction);
    })
  }
}

module.exports = SendoutStatusSchema
