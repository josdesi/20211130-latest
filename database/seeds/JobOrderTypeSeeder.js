'use strict'

/*
|--------------------------------------------------------------------------
| JobOrderTypeSeeder
|--------------------------------------------------------------------------
|
| Make use of the Factory instance to seed database with dummy data or
| make use of Lucid models directly.
|
*/

/** @type {import('@adonisjs/lucid/src/Factory')} */
const Database = use('Database');

// Models
const JobOrderType = use('App/Models/JobOrderType');

class JobOrderTypeSeeder {
  async run () {
    const jobOrderTypes = [
      {id: 0, title: 'Search Assignment', style_class_name: 'active'},
      {id: 1, title: 'POEJO', style_class_name: 'standby'},
      {id: 2, title: `Can't help`, style_class_name: 'inactive'},
      {id: 3, title: 'Sendout', style_class_name: 'sendout'},
      {id: 4, title: 'Placement', style_class_name: 'placement'},
      {id: 5, title: 'Inactive', style_class_name: 'offline'}
    ];

    const transaction = await Database.beginTransaction();

    try {
      for(const jobOrderType of jobOrderTypes) {
        const exists = await JobOrderType.find(jobOrderType.id);
        if (exists) {
          continue;
        }
        await JobOrderType.create(jobOrderType, transaction);
      }
      transaction.commit();
    } catch(error) {
      transaction.rollback();
    }
  }
}

module.exports = JobOrderTypeSeeder