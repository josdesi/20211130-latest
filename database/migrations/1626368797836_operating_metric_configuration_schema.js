'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');
const Database = use('Database');
const { candidateOperatingTemplate } = use('App/Helpers/OperatingMetrics');

class OperatingMetricConfigurationSchema extends Schema {
  up () {
    this.schedule(async (transaction) => {
      try {
        await Database.table('operating_metric_configurations').where('id', 1).andWhere('entity', 'candidate')
        .update(
          {
            checklist: JSON.stringify(candidateOperatingTemplate)
          }
        ).transacting(transaction);
        
        await transaction.commit();
      } catch(error) {
        await transaction.rollback();
        throw error;
      }
    });
  }

  down () {
    this.table('operating_metric_configurations', (table) => {
      // reverse alternations
    })
  }
}

module.exports = OperatingMetricConfigurationSchema
