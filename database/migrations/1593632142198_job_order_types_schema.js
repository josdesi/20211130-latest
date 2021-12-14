'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')
const Database = use('Database');

class JobOrderTypesSchema extends Schema {
  up () {
    this.table('job_order_types', (table) => {
    })
    this.schedule(async (trx) => {
      await Database.table('job_order_types')
        .transacting(trx)
        .update({style_class_name: '#27AE60'}).where('id', 0)

      await Database.table('job_order_types')
        .transacting(trx)
        .update({style_class_name: '#F39C12'}).where('id', 1)
      
      await Database.table('job_order_types')
        .transacting(trx)
        .update({style_class_name: '#E9250C'}).where('id', 2)

      await Database.table('job_order_types')
        .transacting(trx)
        .update({style_class_name: '#4056F4'}).where('id', 3)

      await Database.table('job_order_types')
        .transacting(trx)
        .update({style_class_name: '#25307C'}).where('id', 4)
      
      await Database.table('job_order_types')
        .transacting(trx)
        .update({style_class_name: '#9b9ea7'}).where('id', 5)
    })
  }

  down () {
    this.table('job_order_types', (table) => {
    })
  }
}

module.exports = JobOrderTypesSchema
