'use strict'

/*
|--------------------------------------------------------------------------
| DarrrinTestDigSeeder
|--------------------------------------------------------------------------
|
| Make use of the Factory instance to seed database with dummy data or
| make use of Lucid models directly.
|
*/

/** @type {import('@adonisjs/lucid/src/Factory')} */
const Database = use('Database')
const User = use('App/Models/User');
const Industry = use('App/Models/Industry');
const RecruiterHasIndustry = use('App/Models/RecruiterHasIndustry');
class DarrrinTestDigSeeder {
  async run (externalTransaction) {
    const transaction = externalTransaction ? externalTransaction : await Database.beginTransaction();
    try {
      const coachEmail = 'darrin.tebeest@gogpac.com';
      const recruiterEmails = [
        'steven.walli@gogpac.com',
        'mitchel.foster@gogpac.com',
        'derek.rintala@gogpac.com',
        'christian.lewis@gogpac.com',
        'jerome.jeffcoat@gogpac.com',
        'melvin.hall@gogpac.com',
        'josh.krause@gogpac.com',
        'ken.uglow@gogpac.com',
        'leigh.jerzak@gogpac.com',
        'angela.parchomenko@gogpac.com',
        'april.gilbert@gogpac.com',
        'emily.tyson@gogpac.com',
        'gordy.barth@gogpac.com',
        'travis.marcum@gogpac.com',
        'chaka.kelly@gogpac.com',
        'enrique.ramos@gogpac.com',
        'nancy.poxleitner@gogpac.com',
        'john.munoz@gogpac.com',
        'victoria.rossi@gogpac.com',
        'john.chisham@gogpac.com',
        'logan.wentzel@gogpac.com',
        'shaun.boen@gogpac.com',
        'Emilio.Leon@gogpac.com'
      ];
      const coach = await User.query().where('email', coachEmail).first();
      if (!coach) {
        throw new Error(`Coach ${coachEmail} not found`);
      }
      const recruiters = await User.query().whereIn('email', recruiterEmails).fetch();
      const industry = await Industry.query().where('title', 'Construction').first();
      if (!industry) {
        throw new Error(`Industry ${Construction} not found`);
      }

      const digToAssign = recruiters.rows.map(recruiter => {
        return {
          coach_id: coach.id,
          industry_id: industry.id,
          recruiter_id: recruiter.id 
        };
      });
      const promises = digToAssign.map(dig => RecruiterHasIndustry.create(dig, transaction));
      await Promise.all(promises);
      (!externalTransaction) && await transaction.commit();
    } catch(error) {
      (!externalTransaction) && (transaction) && await transaction.rollback();
      throw error;
    }
  }
}



module.exports = DarrrinTestDigSeeder