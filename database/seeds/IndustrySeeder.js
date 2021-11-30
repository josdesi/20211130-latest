'use strict';

/*
|--------------------------------------------------------------------------
| IndustrySeeder
|--------------------------------------------------------------------------
|
| Make use of the Factory instance to seed database with dummy data or
| make use of Lucid models directly.
|
*/

const Industry = use('App/Models/Industry');
const { industries } = require('../data/IndustriesData');

class IndustrySeeder {
  static async run() {
    for (const iterator in industries) {
      await Industry.findOrCreate({ title: industries[iterator].title });
    }
  }
}

module.exports = IndustrySeeder;
