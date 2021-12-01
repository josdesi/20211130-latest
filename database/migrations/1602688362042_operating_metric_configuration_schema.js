'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class OperatingMetricConfigurationSchema extends Schema {
  up () {
    this.table('operating_metric_configurations', (table) => {
      // alter table
      table.string('before_metric_renew', 50).notNullable().defaultTo('12 hours');
    })
  }

  down () {
    this.table('operating_metric_configurations', (table) => {
      // reverse alternations
      table.dropColumn('before_metric_renew');
    })
  }
}

module.exports = OperatingMetricConfigurationSchema
