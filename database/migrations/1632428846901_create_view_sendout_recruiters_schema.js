'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')
const Database = use('Database');

class CreateViewSendoutRecruitersSchema extends Schema {
  up () {
    this.schedule(async (transaction) => {
      const createView = `CREATE OR REPLACE VIEW v_sendout_recruiters
        as SELECT vu.recruiter_id,
            vu.regional_full_name AS regional,
            vu.coach_name AS coach,
            vu.user_name AS recruiter,
            vu.initials,
            vu.start_date
          FROM v_users vu
          WHERE vu.coach_id IS NOT NULL AND vu.recruiter_id IS NOT NULL AND vu.user_status_id = 1;`;
      try {
        await Database.raw(createView).transacting(transaction);
        await transaction.commit();
      } catch(error) {
        await transaction.rollback();
        throw error;
      }
    });
  }
}

module.exports = CreateViewSendoutRecruitersSchema
