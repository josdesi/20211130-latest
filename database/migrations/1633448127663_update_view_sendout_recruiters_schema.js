'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')
const Database = use('Database');

class UpdateViewSendoutRecruitersSchema extends Schema {
  up () {
    this.schedule(async (transaction) => {
      const createView = `CREATE OR REPLACE VIEW v_sendout_recruiters
        AS SELECT vu.recruiter_id,
            vu.regional_full_name AS regional,
            vu.coach_name AS coach,
            vu.user_name AS recruiter,
            vu.initials,
            vu.start_date,
            concat('Region', ' ', split_part(vu.regional_full_name::text, ' '::text, 1)) AS regional_alias,
            split_part(vu.coach_name::text, ' '::text, 1) AS coach_alias
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

module.exports = UpdateViewSendoutRecruitersSchema
