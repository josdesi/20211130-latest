'use strict';


/*
|--------------------------------------------------------------------------
| SendoutStatusSeeder
|--------------------------------------------------------------------------
|
| Make use of the Factory instance to seed database with dummy data or
| make use of Lucid models directly.
|
*/

/** @type {import('@adonisjs/lucid/src/Factory')} */
const { SendoutStatusSchemes, SendoutTypesSchemes } = use('App/Helpers/Globals');

const SendoutStatus = use('App/Models/SendoutStatus');

class SendoutStatusSeeder {
  static async run(trx) {
    const data = [
      { id: SendoutStatusSchemes.Active, title: 'Active', style: '#27AE60', sendout_type_id: SendoutTypesSchemes.Sendout, label: 'Active Accounts' },
      { id: SendoutStatusSchemes.Placed, title: 'Placed', style: '#3CA0EC', sendout_type_id: SendoutTypesSchemes.Sendout, label: 'Placed Candidates' },
      { id: SendoutStatusSchemes.NoOffer, title: 'No offer', style: '#6A7381', sendout_type_id: SendoutTypesSchemes.Sendout, label: 'No offer' },
      { id: SendoutStatusSchemes.Declined, title: 'Declined', style: '#FA632E', sendout_type_id: SendoutTypesSchemes.Sendout, label: 'Offer Declined' },
      { id: SendoutStatusSchemes.Sendover, title: 'Active',  style: '#27AE60', sendout_type_id: SendoutTypesSchemes.Sendover, label: 'Sendovers' },
      { id: SendoutStatusSchemes.SendoverNoOffer, title: 'No offer', style: '#6A7381', sendout_type_id: SendoutTypesSchemes.Sendover, label: 'No offer' },
      { id: SendoutStatusSchemes.SendoverDeclined, title: 'Declined', style: '#FA632E', sendout_type_id: SendoutTypesSchemes.Sendover, label: 'Offer Declined' },
    ];

    for (const item of data) {
      if (await SendoutStatus.find(item.id)) {
        await SendoutStatus.query().where('id', item.id).transacting(trx).update(item);
        continue;
      } else {
        await SendoutStatus.create(item, trx);
      }
    }
  }
}

module.exports = SendoutStatusSeeder;
