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
const Factory = use('Factory');
const Specialty = use('App/Models/Specialty');
const Subspecialty = use('App/Models/Subspecialty');
const Industry = use('App/Models/Industry');
const { subspecialties } = require('../data/IndustriesData');

class SubspecialtySeeder {
  static async run() {
    for (const iterator in subspecialties) {
      const { title, industry, specialty } = subspecialties[iterator];
      const _industry = await Industry.findBy('title', industry);
      const _specialty = await Specialty.query()
        .where({ title: specialty })
        .where({ industry_id: _industry.id })
        .first();
      const subspecialty = await Subspecialty.findOrCreate({ title, specialty_id: _specialty.id });
    }
  }
}

module.exports = SubspecialtySeeder;
