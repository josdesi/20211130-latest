'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')
const Database = use('Database')
class SendgridConfigurationsSchema extends Schema {
  up () {
    this.schedule(async (transaction) => {
      
        await Database.table('sendgrid_configurations')
          .insert({type: 'feeeSendoutsCopyEmail', sender: 'notifications@gogpac.com', template_id: 'd-bd2bb78ed679486dbaa7a4c9dffdb152'})
          .transacting(transaction);
      
    });
  }

  down () {
    this.table('sendgrid_configurations', (table) => {
      // reverse alternations
    })
  }
}

module.exports = SendgridConfigurationsSchema
