'use strict';

/*
|--------------------------------------------------------------------------
| EmailOptOutTypeSeeder
|--------------------------------------------------------------------------
|
| Make use of the Factory instance to seed database with dummy data or
| make use of Lucid models directly.
|
*/

/** @type {import('@adonisjs/lucid/src/Factory')} */
const EmailOptOutType = use('App/Models/EmailOptOutType');
const { EmailOptOutTypes } = use('App/Helpers/Globals');

class EmailOptOutTypeSeeder {
  static async run(trx) {
    const emailOptOutTypes = [
      {
        id: EmailOptOutTypes.Candidate,
        title: 'Candidate',
      },
      {
        id: EmailOptOutTypes.HiringAuthority,
        title: 'Hiring Authority',
      },
      {
        id: EmailOptOutTypes.Names,
        title: 'Name',
      },
      {
        id: EmailOptOutTypes.User,
        title: 'User',
      },
    ];

    for (const emailOptOutType of emailOptOutTypes) {
      const result = await EmailOptOutType.query()
        .where('id', emailOptOutType.id)
        .andWhere('title', emailOptOutType.title)
        .first();

      if (result) continue;

      if (await EmailOptOutType.find(emailOptOutType.id)) {
        await EmailOptOutType.query().where('id', emailOptOutType.id).transacting(trx).update(emailOptOutType);
      } else {
        await EmailOptOutType.create(emailOptOutType, trx);
      }
    }
  }
}

module.exports = EmailOptOutTypeSeeder;
