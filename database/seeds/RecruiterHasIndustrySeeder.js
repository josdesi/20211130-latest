'use strict';

/*
|--------------------------------------------------------------------------
| RecruiterHasIndustrySeeder
|--------------------------------------------------------------------------
|
| Make use of the Factory instance to seed database with dummy data or
| make use of Lucid models directly.
|
*/

/** @type {import('@adonisjs/lucid/src/Factory')} */
const { recruiterIndustries } = require('../data/RecruiterIndustryData');
const Database = use('Database');
const RecruiterHasIndustry = use('App/Models/RecruiterHasIndustry');
const User = use('App/Models/User');
const State = use('App/Models/State');
const Industry = use('App/Models/Industry');
const Specialty = use('App/Models/Specialty');
const Subspecialty = use('App/Models/Subspecialty');

class RecruiterHasIndustrySeeder {
  static async run() {
    const trx = await Database.beginTransaction();
    try {
      for (const iterator in recruiterIndustries) {
        const { coach, recruiter, industry, state, specialty, subspecialty } = recruiterIndustries[iterator];
        const { id: coach_id } = await User.findBy({ email: coach });
        const { id: recruiter_id } = await User.findBy({ email: recruiter });
        const { id: state_id } = await State.findBy({ slug: state });
        const { id: industry_id } = await Industry.findBy({ title: industry });
        const _specialty = await Specialty.query().where({ title: specialty }).where({ industry_id }).first();
        const _subspecialty = await Subspecialty.query()
          .where({ title: subspecialty })
          .where({ specialty_id: _specialty.id })
          .first();

        let rhi = await RecruiterHasIndustry.create(
          {
            coach_id,
            recruiter_id,
            state_id,
            industry_id,
            specialty_id: _specialty.id,
            subspecialty_id: _subspecialty ? _subspecialty.id : null,
          },
          trx
        );
      }
      await trx.commit();
    } catch (error) {
      trx.rollback();
    }
  }
}

module.exports = RecruiterHasIndustrySeeder;
