'use strict'

/*
|--------------------------------------------------------------------------
| WorkTypeSeeder
|--------------------------------------------------------------------------
|
| Make use of the Factory instance to seed database with dummy data or
| make use of Lucid models directly.
|
*/

/** @type {import('@adonisjs/lucid/src/Factory')} */
const Factory = use('Factory')
const WorkTypeOption = use('App/Models/WorkTypeOption');
const Database = use('Database');
class WorkTypeOptionSeeder {
  static async run () {
    const transaction = await Database.beginTransaction();
    try {
      const workTypeOptions = [
        {id: 1, title: 'On-Site'},
        {id: 2, title: 'Remote'},
        {id: 3, title: 'Remote and On-Site'},
      ]
      for(const workTypeOption of workTypeOptions) {
        const exists = await WorkTypeOption.find(workTypeOption.id);
        if (exists) {
          continue;
        }
        await WorkTypeOption.create(workTypeOption, transaction);
      }
      transaction.commit();
    } catch(error) {  
      transaction.rollback();
    }
  }
}

module.exports = WorkTypeOptionSeeder
