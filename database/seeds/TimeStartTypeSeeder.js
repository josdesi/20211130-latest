'use strict'

/*
|--------------------------------------------------------------------------
| TimeStartTypeSeeder
|--------------------------------------------------------------------------
|
| Make use of the Factory instance to seed database with dummy data or
| make use of Lucid models directly.
|
*/

/** @type {import('@adonisjs/lucid/src/Factory')} */
const TimeStartType = use('App/Models/TimeStartType')

class TimeStartTypeSeeder {
  static async run () {
    const data = [
      { id: 0, title: 'ASAP' },
      { id: 1, title: '1 - 2 Weeks' },
      { id: 2, title: '3 - 4 Weeks' },
      { id: 3, title: '1 - 2 Months' },
      { id: 4, title: '3 Months +' },
    ];

    await TimeStartType.createMany(data)
  }
}

module.exports = TimeStartTypeSeeder
