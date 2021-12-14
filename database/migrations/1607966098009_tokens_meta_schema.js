'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class TokensMetaSchema extends Schema {
  up () {
    this.create('tokens_meta', (table) => {
      table.increments()
      table
        .integer('token_id')
        .unsigned()
        .references('id')
        .on('tokens');
      table
        .integer('user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .on('users');
      table.string('user_agent', 1024).notNullable();
      table.string('referer', 4096);
      
      table.timestamps()
    })
  }

  down () {
    this.drop('tokens_meta')
  }
}

module.exports = TokensMetaSchema
