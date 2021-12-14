'use strict'

const { JobOrderStatusSchemes, StatusColorsSchemes } = use('App/Helpers/Globals');

/*
|--------------------------------------------------------------------------
| JobOrderStatusSeeder
|--------------------------------------------------------------------------
|
| Make use of the Factory instance to seed database with dummy data or
| make use of Lucid models directly.
|
*/

/** @type {import('@adonisjs/lucid/src/Factory')} */

// Models
const JobOrderStatus = use('App/Models/JobOrderStatus');

class JobOrderStatusSeeder {
  static async run (trx) {
    const data = [
      { id: JobOrderStatusSchemes.Ongoing, title: 'Ongoing' , style: StatusColorsSchemes.Ongoing, selectable: true },
      { id: JobOrderStatusSchemes.Sendout, title: 'Sendout' , style: StatusColorsSchemes.Sendout, selectable: false },
      { id: JobOrderStatusSchemes.Sendover, title: 'Sendover' , style: StatusColorsSchemes.Sendover, selectable: false },
      { id: JobOrderStatusSchemes.Placed, title: 'Placed' , style: StatusColorsSchemes.Placed, selectable: false },
      { id: JobOrderStatusSchemes.Inactive, title: 'Inactive' , style: StatusColorsSchemes.Inactive, selectable: true }
    ];

    for (const status of data) {
      if (await JobOrderStatus.find(status.id)) {
        await JobOrderStatus.query().where('id', status.id).update(status, trx);
        continue;
      } else {
        await JobOrderStatus.create(status, trx);
      }
    }
  }
}

module.exports = JobOrderStatusSeeder
