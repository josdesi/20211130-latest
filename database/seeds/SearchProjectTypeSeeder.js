'use strict';

/*
|--------------------------------------------------------------------------
| SearchProjectTypeSeeder
|--------------------------------------------------------------------------
|
| Make use of the Factory instance to seed database with dummy data or
| make use of Lucid models directly.
|
*/

/** @type {import('@adonisjs/lucid/src/Factory')} */
const SearchProjectType = use('App/Models/SearchProjectType');
const { SearchProjectTypes } = use('App/Helpers/Globals');

class SearchProjectTypeSeeder {
  static async run(trx) {
    const searchProjectTypes = [
      { id: SearchProjectTypes.Candidate, title: 'Candidate' },
      { id: SearchProjectTypes.HiringAuthority, title: 'Hiring Authority' },
      { id: SearchProjectTypes.Name, title: 'Name' },
      { id: SearchProjectTypes.NameCandidate, title: 'Candidate Lead' },
      { id: SearchProjectTypes.NameHA, title: 'Hiring Authority Lead' },
    ];

    for (const searchProjecType of searchProjectTypes) {
      const result = await SearchProjectType.query()
        .where('id', searchProjecType.id)
        .andWhere('title', searchProjecType.title)
        .first();

      if (result) continue;

      const ocuppiedId = await SearchProjectType.find(searchProjecType.id);
      if (ocuppiedId)
        throw `The id ${ocuppiedId.id} is already occupied by ${ocuppiedId.title}, this could cause conflict with the data already existing using this id by under another title; if the title is just a typographical correction, a manual update is expected`;

      await SearchProjectType.create(searchProjecType, trx);
    }
  }
}

module.exports = SearchProjectTypeSeeder;
