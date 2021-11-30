'use strict';

/*
|--------------------------------------------------------------------------
| SpecialtySeeder
|--------------------------------------------------------------------------
|
| Make use of the Factory instance to seed database with dummy data or
| make use of Lucid models directly.
|
*/

/** @type {import('@adonisjs/lucid/src/Factory')} */
const Specialty = use('App/Models/Specialty');
const Industry = use('App/Models/Industry');
const { specialties } = require('../data/IndustriesData');

class SpecialtySeeder {
  static async run() {
    for (const iterator in specialties) {
      const { title, industry } = specialties[iterator];
      const _industry = await Industry.findBy('title', industry);
      await Specialty.findOrCreate({ title, industry_id: _industry.id });
    }
  }
}

module.exports = SpecialtySeeder;
