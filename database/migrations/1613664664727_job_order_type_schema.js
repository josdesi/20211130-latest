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
      table.specificType('available', 'smallint').defaultTo(1);
    })

    this.schedule(async (trx) => {
      const query = `
        UPDATE job_order_types
          SET available = 0
        WHERE job_order_types.id IN (3, 4)
      `;

      try {
        await Database.raw(query).transacting(trx);
        await trx.commit();
      } catch (error) {
        await trx.rollback();
        throw error;
      }
    })

    // this.schedule(async (trx) => {
    //   const jobOrderTypes = [
    //     {id: 0, title: 'Search Assignment', style_class_name: StatusColorsSchemes.SearchAssignment },
    //     {id: 1, title: 'POEJO', style_class_name: StatusColorsSchemes.Poejo },
    //     {id: 2, title: `Can't help`, style_class_name: StatusColorsSchemes.CantHelp }
    //   ];

    //   const JobOrderTypeLogs = `
    //     UPDATE job_order_type_logs
    //       SET job_order_type_id = 0
    //     WHERE job_order_type_id > 2
    //   `;

    //   try {
    //     // await Database.raw(JobOrderTypeLogs).transacting(trx);

    //     for (const type of jobOrderTypes) {
    //       if (await JobOrderType.find(type.id)) {
    //         await JobOrderType.query().where('id', type.id).update(type, trx);
    //         continue;
    //       }
    //     }
    //     await JobOrderType.query().where('id', '>=', 3).transacting(trx).delete();
    //   } catch (error) {
    //     await trx.rollback();
    //     throw error;
    //   }
    // })
  }

  down () {
    this.table('job_order_types', (table) => {
      // reverse alternations
      table.dropColumn('available');
    })
  }
}

module.exports = JobOderTypeSchema
