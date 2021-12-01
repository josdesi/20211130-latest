'use strict'

/*
|--------------------------------------------------------------------------
| PermissionSeeder
|--------------------------------------------------------------------------
|
| Make use of the Factory instance to seed database with dummy data or
| make use of Lucid models directly.
|
*/

/** @type {import('@adonisjs/lucid/src/Factory')} */
const Factory = use('Factory')
const Permission = use('App/Models/Permission');
const { userPermissions } = use('App/Helpers/Globals');
const User = use('App/Models/User');
const UserHasRole = use('App/Models/UserHasRole');
const RecruiterHasIndustry = use('App/Models/RecruiterHasIndustry');
const UserHasPermission = use('App/Models/UserHasPermission');
const Database = use('Database');

class TestNewFeeAgreementPermissionSeeder {
  async run (externalTransaction) {
    const transaction = externalTransaction ? externalTransaction : await Database.beginTransaction();
    try {
      //Setup user with their roles;
      //Setup Production director;
      let permissionsToAssign = [];
      let rolesToAssign = [];
      const coachEmail = 'darrin.tebeest@gogpac.com';
      const coach = await User.query().where('email', coachEmail).first();
      const productionDirectorEmail = 'jason.lawrenson@gogpac.com';
      const operationsEmails = ['elizabeth.sonnenfeld@gogpac.com', 'kaitlyn.rintala@gogpac.com', 'nessa.iverson@gogpac.com', 'cathryn.hanzlik@gogpac.com', 'isidro.vasquez@gogpac.com'];
      const productionDirector = await User.query().where('email', productionDirectorEmail).first();
      if (!productionDirector) {
        throw new Error(`Production director not found, email: ${productionDirectorEmail}`);
      }
      if (!coach) {
        throw new Error(`Coach not found, email: ${coachEmail}`);
      }
      permissionsToAssign.push({user_id: productionDirector.id, permission_id: userPermissions.newFeeAgreements.use});
      rolesToAssign.push({
        user_id: productionDirector.id,
        role_id: 5
      });
      const operationsTeamUsers = await User.query().whereIn('email', operationsEmails).fetch();
      const operationsRolesToAssign = operationsTeamUsers.rows.map((user) => ({user_id: user.id, role_id: 6}));
      const operationsPermissionsToAssign = operationsTeamUsers.rows.map((user) => ({user_id: user.id, permission_id: userPermissions.newFeeAgreements.use}));
      rolesToAssign = rolesToAssign.concat(operationsRolesToAssign);
      permissionsToAssign = permissionsToAssign.concat(operationsPermissionsToAssign);
      const blakeTeamDig = await RecruiterHasIndustry.query().select(['recruiter_id']).where('coach_id', coach.id).fetch();
      const blakeTeamDigIds = blakeTeamDig.rows.map(({recruiter_id}) => recruiter_id);
      const blakeTeamRecruiters = await User.query().whereIn('id', blakeTeamDigIds).fetch();
      const recruiterPermissionsToAssign = blakeTeamRecruiters.rows.map((user) => ({user_id: user.id, permission_id: userPermissions.newFeeAgreements.use}));
      permissionsToAssign = permissionsToAssign.concat([...recruiterPermissionsToAssign, {user_id: coach.id, permission_id: userPermissions.newFeeAgreements.use}]);
      const permissionPromises = permissionsToAssign.map(p => UserHasPermission.create(p, transaction));
      const rolePromises = rolesToAssign.map(r => UserHasRole.create(r, transaction));
      await Promise.all(permissionPromises);
      await Promise.all(rolePromises);
      (!externalTransaction) && (await transaction.commit());
    } catch(error) {
      (!externalTransaction) && (await transaction.rollback());
      throw error;
    }
  }
}

module.exports = TestNewFeeAgreementPermissionSeeder
