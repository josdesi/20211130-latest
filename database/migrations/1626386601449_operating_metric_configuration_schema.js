'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')
const Database = use('Database');
const { jobOrderOperatingTemplate } = use('App/Helpers/OperatingMetrics');

class OperatingMetricConfigurationSchema extends Schema {
  up () {
    this.schedule(async (transaction) => {
      try {
        await Database.table('operating_metric_configurations').where('id', 2).andWhere('entity', 'joborder')
        .update(
          {
            checklist: JSON.stringify(jobOrderOperatingTemplate)
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
