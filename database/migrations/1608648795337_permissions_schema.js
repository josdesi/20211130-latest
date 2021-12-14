'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const PermissionSeeder = require('../seeds/PermissionSeeder');
const Schema = use('Schema')
const Database = use('Database');
class PermissionsSchema extends Schema {
  up () {
    this.table('permissions', (table) => {
      
    })

    this.schedule(async (transaction) => {
      try {
        await PermissionSeeder.run(transaction);
        const query = `
          INSERT INTO user_has_permissions (permission_id, user_id)
          SELECT 7, users.id FROM USERS WHERE users.email IN 
          (
            'jason.lawrenson@gogpac.com',
            'isidro.vasquez@gogpac.com',
            'emilio.Leon@gogpac.com',
            'sergio.valladares@gogpac.com',
            'roberto.deanda@gogpac.com',
            'francisco.regalado@gogpac.com',
            'diana.alonso@gogpac.com',
            'mario.moreno@gogpac.com',
            'cristopher.tovilla@gogpac.com',
            'kevin.velazquez@gogpac.com'
          )
        `;
        await Database.raw(query).transacting(transaction);

        await transaction.commit();
        
      } catch(error) {
        await transaction.rollback();
        throw error;
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
