'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');
const Database = use('Database');

class SengridConfigurationSchema extends Schema {
  up () {
    this.schedule(async (transaction) => {
      await Database.table('sendgrid_configurations')
        .transacting(transaction)
        .insert([
          { type: 'PhoneSummaryCoach', sender: 'notifications@gogpac.com' , template_id: 'd-4e49f811a28440918dd12d6d535fb587'},
          { type: 'PhoneSummaryRegional', sender: 'notifications@gogpac.com' , template_id: 'd-d8226b03584f47d8a18bfec3009273ad'}
        ]);
    });
  }

  down () {
    this.table('sengrid_configurations', (table) => {
      // reverse alternations
    })
  }
}

module.exports = SengridConfigurationSchema
