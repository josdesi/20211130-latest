'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')
const { statesAndProvinces } = require('../data/StatesData');

class LoadSpecialCaseUkSchema extends Schema {
  up () {
    const britainCounty = statesAndProvinces.filter((val) => val.id === 71);
    this.schedule(async (transaction) => {
      await transaction.table('countries').insert({ id: 4, title: 'United Kingdom', slug: 'UK' , available_for_recruiting: true});
      await transaction.table('states').insert(britainCounty);
      await transaction.table('cities').insert({ id: 59144, state_id: 71, title: 'Orawell', is_state: 0});
      await transaction.table('zip_codes').insert({ city_id: 59144, state_id: 71, latitude: 52.137577, longitude: -0.0183725, zip_ch: 'SG8 5QX', formatted_zip: 'SG8 5QX'});
    });
  }

  down () {
    this.schedule(async (transaction) => {
      await transaction.table('zip_codes').where('city_id', 59144).delete();
      await transaction.table('cities').where('id', 59144).delete();
      await transaction.table('states').where('id', 71).delete();
      await transaction.table('countries').where('id', 4).delete();
    });
  }
}

module.exports = LoadSpecialCaseUkSchema
