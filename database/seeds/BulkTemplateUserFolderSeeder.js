'use strict';

/*
|--------------------------------------------------------------------------
| BulkTemplateUserFolderSeeder
|--------------------------------------------------------------------------
|
| Make use of the Factory instance to seed database with dummy data or
| make use of Lucid models directly.
|
*/

/** @type {import('@adonisjs/lucid/src/Factory')} */
const RecruiterHasIndustry = use('App/Models/RecruiterHasIndustry');
const BulkEmailTemplateRepository = new (use('App/Helpers/BulkEmailTemplateRepository'))();


  /**
   * @summary A one run time script, gets all users in the DIG, checks if they have their default tempalte folders, if a user is added later there isn't any problem, that flow is already covered
   */
class BulkTemplateUserFolderSeeder {
  static async run(trx) {
    const userIds = (await RecruiterHasIndustry.query().select('recruiter_id').distinct().fetch()).toJSON();

    for (const userId of userIds) {
      await BulkEmailTemplateRepository.checkUserDefaultFolders(userId.recruiter_id, trx);
    }
  }
}

module.exports = BulkTemplateUserFolderSeeder;
