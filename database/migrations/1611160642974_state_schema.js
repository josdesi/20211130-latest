'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');
const { statesAndProvinces } = require('../data/StatesData');
const State = use('App/Models/State');

class StateSchema extends Schema {
  up() {
    const canadianProvinces = statesAndProvinces.filter((val) => val.country_id === 2);
    this.schedule(async () => {
      for (const val of canadianProvinces) {
        await State.findOrCreate({ id: val.id }, val);
      }
    });
  }

  down() {
    this.schedule(async () => {
      await State.query().where('country_id', 2).delete();
    });
  }
}

module.exports = StateSchema;
