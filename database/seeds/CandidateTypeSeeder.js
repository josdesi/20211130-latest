'use strict'

/*
|--------------------------------------------------------------------------
| CandidateTypeSeeder
|--------------------------------------------------------------------------
|
| Make use of the Factory instance to seed database with dummy data or
| make use of Lucid models directly.
|
*/

/** @type {import('@adonisjs/lucid/src/Factory')} */
const Database = use('Database');

// Models
const CandidateType = use('App/Models/CandidateType');

class CandidateTypeSeeder {
  async run () {
    const candidateTypes = [
      {id: 0, title: 'Alpha', style_class_name: 'active'},
      {id: 1, title: 'POEJO', style_class_name: 'standby'},
      {id: 2, title: `Can't help`, style_class_name: 'inactive'},
      {id: 3, title: 'Sendout', style_class_name: 'sendout'},
      {id: 4, title: 'Placement', style_class_name: 'placement'},
      {id: 5, title: 'Inactive', style_class_name: 'offline'}
    ];

    const transaction = await Database.beginTransaction();

    try {
      for(const candidateType of candidateTypes) {
        const exists = await CandidateType.find(candidateType.id);
        if (exists) {
          continue;
        }
        await CandidateType.create(candidateType, transaction);
      }
      await transaction.commit();
    } catch(error) {
      await transaction.rollback();
    }
  }
}

module.exports = CandidateTypeSeeder