'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')
const Database = use('Database');

class SendoutsSchema extends Schema {
  up () {
    this.schedule(async (trx) => {
      const query = `
        UPDATE sendouts
        SET company_owner_id = recruiter_id
        WHERE company_owner_id IS NULL
      `;

      try {
        await Database.raw(query).transacting(trx);
        await trx.commit();
      } catch (error) {
        await trx.rollback();
        throw error;
      }
    });
  }

  down () {
    this.table('sendouts', (table) => {
      // reverse alternations
    })
  }
}

module.exports = SendoutsSchema
