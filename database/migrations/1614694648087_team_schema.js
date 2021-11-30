'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

// Seeder
const TeamSeeder = require('../Seeds/TeamSeeder');

class TeamSchema extends Schema {
  up () {
    this.create('teams', (table) => {
      table.increments()
      table.integer('regional_director_id').unsigned().references('id').on('users')
      table.integer('coach_id').references('id').inTable('users')
      table.string('email', 128).notNullable().unique();
      table.timestamps()
    })

    this.schedule(async (trx) => {
      try {
        await TeamSeeder.run(trx);
        await trx.commit();
      } catch (error) {
        await trx.rollback();
        throw error;
      }
    });
  }

  down () {
    this.drop('teams')
  }
}

module.exports = TeamSchema
