'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class MicrosoftGraphSubscriptionSchema extends Schema {
  up () {
    this.table('microsoft_graph_subscriptions', (table) => {
      // alter table
      table.string('resource', 100);
    })
  }

  down () {
    this.table('microsoft_graph_subscriptions', (table) => {
      // reverse alternations
      table.dropColumn('resource')
    })
  }
}

module.exports = MicrosoftGraphSubscriptionSchema
