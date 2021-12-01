'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');
const Database = use('Database');
const { candidateOperatingTemplate, jobOrderOperatingTemplate } = use('App/Helpers/OperatingMetrics');

class OperatingMetricConfigurationSchema extends Schema {
  up() {
    this.create('operating_metric_configurations', (table) => {
      table.increments();
      table.string('entity', 50).notNullable();
      table.string('metric_frequency', 50).notNullable();
      table.string('reminder_frequency', 50).notNullable();
      table.string('first_metric_offset', 50).notNullable();
      table.jsonb('checklist');
      table.timestamps();
    });

    this.schedule(async (transaction) => {
      await Database.table('operating_metric_configurations')
        .transacting(transaction)
        .insert([
          { entity: 'candidate', metric_frequency: '72 hours', reminder_frequency: '1 days and 10 minutes', first_metric_offset: '20 seconds' , checklist: JSON.stringify(candidateOperatingTemplate) },
          { entity: 'joborder', metric_frequency: '72 hours', reminder_frequency: '1 days and 10 minutes', first_metric_offset: '20 seconds', checklist: JSON.stringify(jobOrderOperatingTemplate) },
          { entity: 'recruiter', metric_frequency: '1 weeks', reminder_frequency: '1 days and 10 minutes', first_metric_offset: '20 seconds' ,checklist: null }
        ]);
    });
  }

  down() {
    this.drop('operating_metric_configurations');
  }
}

module.exports = OperatingMetricConfigurationSchema;
