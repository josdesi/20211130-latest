'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')
const Database = use('Database');
class CompanyTypesSchema extends Schema {
  up () {
    this.table('company_types', (table) => {
    })

    this.schedule(async(transaction) => {
      try {
        await Database.table('sendgrid_configurations')
          .insert({id: 10, type: 'feePDFCCEmail', sender: 'clientservice@gogpac.com', template_id: 'd-4bd9735d71fc444c9da1e03011767cff'})
          .transacting(transaction);
      } catch(error) {
        throw error;
      }
    });
  }

  down () {
    this.table('company_types', (table) => {
      // reverse alternations
    })
  }
}

module.exports = CompanyTypesSchema
