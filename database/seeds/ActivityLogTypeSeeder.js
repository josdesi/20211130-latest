'use strict'

/*
|--------------------------------------------------------------------------
| ActivityLogTypeSeeder
|--------------------------------------------------------------------------
|
| Make use of the Factory instance to seed database with dummy data or
| make use of Lucid models directly.
|
*/

/** @type {import('@adonisjs/lucid/src/Factory')} */
const Factory = use('Factory')
const Database = use('Database')
const ActivityLogType = use('App/Models/ActivityLogType');

class ActivityLogTypeSeeder {
  static async run () {
    const data = [
      { id: 0, title: 'Bulk Email' },
      { id: 1, title: 'Email' },
      { id: 2, title: 'SMS' },
      { id: 3, title: 'Call' },
      { id: 4, title: 'Sendout' },
      { id: 5, title: 'Job Posting' },
      { id: 6, title: 'Check personal inventory' },
      { id: 7, title: 'Check office inventory ' },
      { id: 8, title: 'Check PCR and FortPac inventory' },
      { id: 9, title: 'Create presentation ' },
      { id: 11, title: 'Send Inmails' },
      { id: 12, title: 'Create a roll up/ add to roll up' },
      { id: 13, title: 'Create call plan' },
      { id: 14, title: 'General Update' },
      { id: 15, title: 'Pending Offer' },
      { id: 16, title: 'Offer Sent' },
      { id: 17, title: 'Offer Accepted' },
      { id: 18, title: 'References Completed' },
      { id: 19, title: 'References Release Form Sent' },
      { id: 20, title: 'Interview' },
      { id: 21, title: 'Sendover' },
    ];
    for(const activityType of data){
      const exist = await ActivityLogType.findOrCreate(activityType);
    } 
  }
}

module.exports = ActivityLogTypeSeeder
