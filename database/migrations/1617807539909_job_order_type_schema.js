'use strict'

// const { StatusColorsSchemes } = use('App/Helpers/Globals');

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')
const Database = use('Database');

// Models
// const JobOrderType = use('App/Models/JobOrderType');

class JobOderTypeSchema extends Schema {
  up () {
    this.table('job_order_types', (table) => {
      // alter table
    })

    this.schedule(async (trx) => {
      const query = `
        UPDATE job_order_types
          SET available = 0
        WHERE job_order_types.id > 2
      `;

      try {
        await Database.raw(query).transacting(trx);
        await trx.commit();
      } catch (error) {
        await trx.rollback();
        throw error;
      }
    })
  }

  down () {
    this.table('job_order_types', (table) => {
      // reverse alternations
    })
  }
}

module.exports = JobOderTypeSchema
