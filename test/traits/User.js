'use strict';

const User = use('App/Models/User');
const UserHasRole = use('App/Models/UserHasRole')
const { userRoles } = use('App/Helpers/Globals');
const email = 'user@test.com'
const PersonalInformation = use('App/Models/PersonalInformation');
const Database = use('Database');

module.exports = function (suite) {
  suite.before(async () => {
    try {
      const user = await User.findOrCreate({email})
      //Better to add/remove the roles or permissions only on the test files required to avoid possible colissions
      const roles = [userRoles.Recruiter, userRoles.Operations];
      for(const role of roles){
        await UserHasRole.findOrCreate({ user_id: user.id, role_id: role });
      }

      if (!user.personal_information_id) {
        const trx = await Database.beginTransaction();
        try {
          const personalInformation = await PersonalInformation.create({
            first_name: 'user',
            last_name: 'test',
            full_name: 'user test',
            address_id: 1, //Default Sioux Falls Direction ID
          }, trx);
  
          await user.merge({ personal_information_id: personalInformation.id }, trx);
          await user.save(trx)
          
          await trx.commit();
        } catch (error) {
          await trx.rollback();
          console.error(error)
          appInsights.defaultClient.trackException({exception: error});
        }
      }

      suite.Context.getter('user', () => user);
    } catch (e) {
      console.error(e); 
      throw e;
    }
  });
};