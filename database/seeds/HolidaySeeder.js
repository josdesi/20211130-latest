'use strict';

/*
|--------------------------------------------------------------------------
| HolidaySeeder
|--------------------------------------------------------------------------
|
| Make use of the Factory instance to seed database with dummy data or
| make use of Lucid models directly.
|
*/

/** @type {import('@adonisjs/lucid/src/Factory')} */
const Holiday = use('App/Models/Holiday');

class HolidaySeeder {
  static async run(trx) {
    const data = [
      { date: '2021-01-01', title: 'New Years Day' },
      { date: '2021-04-02', title: 'Good Friday' },
      { date: '2021-05-31', title: 'Memorial Day' },
      { date: '2021-07-05', title: 'Independence Day' },
      { date: '2021-09-06', title: 'Labor Day' },
      { date: '2021-01-25', title: 'Thanksgiving Day' },
      { date: '2021-11-26', title: 'Thanksgiving Day' },
      { date: '2021-12-24', title: 'Christmas Eve' },
      { date: '2021-12-27', title: 'Christmas Eve' },
    ];

    for (const item of data) {
      await Holiday.create(item, trx);
    }
  }
}

module.exports = HolidaySeeder;
