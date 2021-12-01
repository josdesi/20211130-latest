'use strict';

const { userRoles } = use('App/Helpers/Globals');

/*
|--------------------------------------------------------------------------
| TeamSeeder
|--------------------------------------------------------------------------
|
| Make use of the Factory instance to seed database with dummy data or
| make use of Lucid models directly.
|
*/

/** @type {import('@adonisjs/lucid/src/Factory')} */
const Factory = use('Factory');
const Database = use('Database');

// Models
const Team = use('App/Models/Team');

class TeamSeeder {
  static async run(trx) {
    const data = [
      { recruiter: 'abby.deneui@gogpac.com', email: 'teamabby@gogpac.com' },
      { recruiter: 'alex.mayer@gogpac.com', email: 'teammayer@gogpac.com' },
      { recruiter: 'alex.huisken@gogpac.com', email: 'teamalex@gogpac.com' },
      { recruiter: 'andrew.pulsifer@gogpac.com', email: 'teamandrew@gogpac.com' },
      { recruiter: 'anthony.cordova@gogpac.com', email: 'teamanthony@gogpac.com' },
      { recruiter: 'ashley.pawlowski@gogpac.com', email: 'teamashley@gogpac.com' },
      { recruiter: 'brett.rintala@gogpac.com', email: 'teambrett@gogpac.com' },
      { recruiter: 'brock.vandyke@gogpac.com', email: 'teambrock@gogpac.com' },
      { recruiter: 'darrin.tebeest@gogpac.com', email: 'teamdarrin@gogpac.com' },
      { recruiter: 'dave.knutson@gogpac.com', email: 'teamdave@gogpac.com' },
      { recruiter: 'don.strand@gogpac.com', email: 'teamdon@gogpac.com' },
      { recruiter: 'erika.reiman@gogpac.com', email: 'teamerika@gogpac.com' },
      { recruiter: 'greg.schouten@gogpac.com', email: 'teamgreg@gogpac.com' },
      { recruiter: 'jarrad.emery@gogpac.com', email: 'teamjarrad@gogpac.com' },
      { recruiter: 'sal.langerock@gogpac.com', email: 'teamsal@gogpac.com' },
      { recruiter: 'spencer.lawrence@gogpac.com', email: 'teamspencer@gogpac.com' },
      { recruiter: 'ut.udo@gogpac.com', email: 'teamut@gogpac.com' },
      { recruiter: 'weylin.miller@gogpac.com', email: 'teamweylin@gogpac.com' },
      { recruiter: 'cody.eide@gogpac.com', email: 'teamcody@gogpac.com' },
      { recruiter: 'ashleigh.benz@gogpac.com', email: 'teambenz@gogpac.com' },
      { recruiter: 'amy.thomsen@gogpac.com', email: 'teamamy@gogpac.com' },
      { recruiter: 'justin.geiman@gogpac.com', email: 'teamjustin@gogpac.com' },
      { recruiter: 'matthew.norgaard@gogpac.com', email: 'tteammatt@gogpac.com' },
      { recruiter: 'rob.klein@gogpac.com', email: 'teamrob@gogpac.com' },
    ];

    for (const item of data) {
      const query = Database.from('user_has_roles as uhr')
        .select(['uhr.user_id as id', 'u2.email', 'rhi.regional_director_id as regional_id'])
        .innerJoin('users as u2', 'u2.id', 'uhr.user_id')
        .leftJoin('recruiter_has_industries as rhi', 'rhi.coach_id', 'uhr.user_id')
        .where('uhr.role_id', userRoles.Coach)
        .where('u2.email', item.recruiter)
        .limit(1);

      const coach = await query.first();

      if (await Team.findBy('email', item.email)) {
        continue;
      } else {
        if (coach) {
          await Team.create({ regional_director_id: coach.regional_id, coach_id: coach.id, email: item.email }, trx);
        } else {
          continue;
        }
      }
    }
  }
}

module.exports = TeamSeeder;
