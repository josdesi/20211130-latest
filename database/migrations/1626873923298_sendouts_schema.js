'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')
const Database = use('Database');

class SendoutsSchema extends Schema {
  up () {
    this.schedule(async (trx) => {
      const query = `
        UPDATE sendouts
        SET candidate_owner_id = aux.recruiter_id
        FROM (select s.id, s.candidate_id, ca.recruiter_id from sendouts as s inner join candidates as ca on s.candidate_id = ca.id WHERE s.candidate_owner_id IS NULL) as aux
        WHERE aux.id = sendouts.id
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
