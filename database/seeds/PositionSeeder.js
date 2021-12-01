'use strict';

/*
|--------------------------------------------------------------------------
| PositionSeeder
|--------------------------------------------------------------------------
|
| Make use of the Factory instance to seed database with dummy data or
| make use of Lucid models directly.
|
*/

const Position = use('App/Models/Position');
const Industry = use('App/Models/Industry');
const Specialty = use('App/Models/Specialty');
const { positions } = require('../data/PositionsData');

class PositionSeeder {
  static async run() {
    let _subspecialty
    for (const iterator in positions) {
      const { industry, specialty, subspecialty, title } = positions[iterator];
      const { id: industry_id } = await Industry.findBy({ title: industry });
      const { id: specialty_id } = await Specialty.query().where({ title: specialty }).where({ industry_id }).first();
      


      const position = await Position.findOrCreate(
        {
          industry_id,
          specialty_id,
          title,
        },
        { industry_id, specialty_id, title }
      );
    }
  }
}

module.exports = PositionSeeder;
