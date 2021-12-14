'use strict'

/*
|--------------------------------------------------------------------------
| InterviewTypeSeeder
|--------------------------------------------------------------------------
|
| Make use of the Factory instance to seed database with dummy data or
| make use of Lucid models directly.
|
*/

/** @type {import('@adonisjs/lucid/src/Factory')} */
const Factory = use('Factory');
const Database = use('Database');
const { SendoutInterviewTypesSchemes } = use('App/Helpers/Globals');

class SendoutInterviewTypeSeeder {
  static async run(trx) {
    const data = [
      { id: SendoutInterviewTypesSchemes.FaceToFace, title: 'Face to Face Interview' },
      { id: SendoutInterviewTypesSchemes.TelephoneOrVideo, title: 'Telephone / Video Interview' },
    ];

    await Database.table('interview_types').where('id', '>=', 0).transacting(trx).delete()
    await Database.table('interview_types').insert(data).transacting(trx)
  }
}

module.exports = SendoutInterviewTypeSeeder
