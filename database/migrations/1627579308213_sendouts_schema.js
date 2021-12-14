'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class SendoutsSchema extends Schema {
  up () {
    this.table('sendouts', (table) => {
      table.renameColumn('company_owner_id', 'job_order_accountable_id');
      table.renameColumn('candidate_owner_id', 'candidate_accountable_id');
    })
  }

  down () {
    this.table('sendouts', (table) => {
      table.renameColumn('job_order_accountable_id', 'company_owner_id');
      table.renameColumn('candidate_accountable_id', 'candidate_owner_id');
    })
  }
}

module.exports = SendoutsSchema
