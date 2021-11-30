'use strict';

/*
|--------------------------------------------------------------------------
| StateSeeder
|--------------------------------------------------------------------------
|
| Make use of the Factory instance to seed database with dummy data or
| make use of Lucid models directly.
|
*/

/** @type {import('@adonisjs/lucid/src/Factory')} */
const Database = use('Database');
const { statesAndProvinces } = require("../data/StatesData");

class StateSeeder {
  static async run() {
    await Database.table('states').insert(statesAndProvinces);
    await Database.raw("SELECT setval('states_id_seq',?, true)", [statesAndProvinces.length]);
  }
}

module.exports = StateSeeder;
