'use strict'

const { CandidateStatusSchemes, StatusColorsSchemes } = use('App/Helpers/Globals');

/*
|--------------------------------------------------------------------------
| CandidateStatusSeeder
|--------------------------------------------------------------------------
|
| Make use of the Factory instance to seed database with dummy data or
| make use of Lucid models directly.
|
*/

/** @type {import('@adonisjs/lucid/src/Factory')} */
const Factory = use('Factory')

// Models
const CandidateStatus = use('App/Models/CandidateStatus');

class CandidateStatusSeeder {
  static async run (trx) {
    const data = [
      { id: CandidateStatusSchemes.Ongoing, title: 'Ongoing' , style: StatusColorsSchemes.Ongoing, selectable: true },
      { id: CandidateStatusSchemes.Sendout, title: 'Sendout' , style: StatusColorsSchemes.Sendout, selectable: false },
      { id: CandidateStatusSchemes.Sendover, title: 'Sendover' , style: StatusColorsSchemes.Sendover, selectable: false },
      { id: CandidateStatusSchemes.Placed, title: 'Placed' , style: StatusColorsSchemes.Placed, selectable: false },
      { id: CandidateStatusSchemes.Inactive, title: 'Inactive' , style: StatusColorsSchemes.Inactive, selectable: true }
    ];

    for (const status of data) {
      if (await CandidateStatus.find(status.id)) {
        await CandidateStatus.query().where('id', status.id).update(status, trx);
        continue;
      } else {
        await CandidateStatus.create(status, trx);
      }
    }
  }
}

module.exports = CandidateStatusSeeder
