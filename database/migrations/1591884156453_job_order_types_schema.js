'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')
const Database = use('Database');
class JobOrderTypesSchema extends Schema {
  up () {
    this.table('job_order_types', (table) => {
      table.string('style_class_name', 50);
    })

    this.schedule(async (trx) => {
      await Database.table('job_order_types')
        .transacting(trx)
        .where('id', 0)
        .update({style_class_name: 'active'})
      
        await Database.table('job_order_types')
          .transacting(trx)
          .where('id', 1)
          .update({style_class_name: 'standby'})
        
        await Database.table('job_order_types')
          .transacting(trx)
          .where('id', 2)
          .update({style_class_name: 'inactive'})
    })
  }

  down () {
    this.table('job_order_types', (table) => {
      table.dropColumn('style_class_name');
    })
  }
}

module.exports = JobOrderTypesSchema
