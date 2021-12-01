'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')
const Database = use('Database');
const { userPermissions } = use('App/Helpers/Globals');

class PermissionsSchema extends Schema {
  up () {
    this.table('permissions', (table) => {
      // alter table
    })

    this.schedule(async (transaction) => {
      try {
        const recruitersQuery = `
        INSERT INTO user_has_permissions (user_id, permission_id)
        SELECT distinct(recruiter_id), ${userPermissions.newFeeAgreements.use} FROM recruiter_has_industries WHERE coach_id IN (
          SELECT id FROM users WHERE email IN ('erika.reiman@gogpac.com', 'andrew.pulsifer@gogpac.com', 'abby.deneui@gogpac.com')
        )
      `;

      const coachesQuery = `
      INSERT INTO user_has_permissions (user_id, permission_id)
      SELECT id, ${userPermissions.newFeeAgreements.use} FROM users WHERE  email IN ('erika.reiman@gogpac.com', 'andrew.pulsifer@gogpac.com', 'abby.deneui@gogpac.com')
      `;

        
        await Database.raw(recruitersQuery).transacting(transaction);
        await Database.raw(coachesQuery).transacting(transaction);
      } catch(ex) {
        throw ex;
      }
    }); 
  }

  down () {
    this.table('permissions', (table) => {
      // reverse alternations
    })
  }
}

module.exports = PermissionsSchema
