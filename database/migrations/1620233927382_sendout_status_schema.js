'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

const { SendoutStatusSchemes } = use('App/Helpers/Globals');
const statuses = [
  { id: SendoutStatusSchemes.Active, label: 'Active Accounts' },
  { id: SendoutStatusSchemes.Placed, label: 'Placed Candidates' },
  { id: SendoutStatusSchemes.NoOffer, label: 'No offer' },
  { id: SendoutStatusSchemes.Declined, label: 'Offer Declined' },
  { id: SendoutStatusSchemes.Sendover, label: 'Sendovers' }
];

class SendoutStatusSchema extends Schema {
  up () {
    this.table('sendout_statuses', (table) => {
      // alter table
      table.string('label');
    });

    this.schedule(async (transaction) => {
      try {
        for(const status of statuses){
          await transaction.table('sendout_statuses').where('id',status.id).update({label : status.label});
        }
        await transaction.commit();
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    });
  }

  down () {
    this.table('sendout_statuses', (table) => {
      // alter table
      table.dropColumn('label');
    });
  }
}

module.exports = SendoutStatusSchema
