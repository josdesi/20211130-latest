'use strict';

/*
|--------------------------------------------------------------------------
| SubspecialtySeeder
|--------------------------------------------------------------------------
|
| Make use of the Factory instance to seed database with dummy data or
| make use of Lucid models directly.
|
*/

/** @type {import('@adonisjs/lucid/src/Factory')} */
const Specialty = use('App/Models/Specialty');
const Subspecialty = use('App/Models/Subspecialty');
const Industry = use('App/Models/Industry');
const { subspecialties } = require('../data/IndustriesData');

class SubspecialtySeeder {
  static async run() {
    for (const iterator of subspecialties) {
      const { title, industry, specialty } = iterator;
      const _industry = await Industry.findBy('title', industry);
      const _specialty = await Specialty.query()
        .where({ title: specialty })
        .where({ industry_id: _industry.id })
        .first();
      await Subspecialty.findOrCreate({ title, specialty_id: _specialty.id });
    }
  }
}

module.exports = SubspecialtySeeder;
