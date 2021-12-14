'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')
const Database = use('Database');

class UpdateViewSendoutRecruitersSchema extends Schema {
  up () {
    this.schedule(async (transaction) => {
      const createView = `CREATE OR REPLACE VIEW v_sendout_recruiters
        as select recruiters.id as recruiter_id,
            regionalpi.full_name as regional,
            coachpi.full_name as coach,
            recruiterpi.full_name as recruiter,
            recruiters.initials as initials,
            recruiters.start_date as start_date,
            concat('Region', ' ', split_part(regionalpi.full_name::text, ' '::text, 1)) AS regional_alias,
            split_part(coachpi.full_name::text, ' '::text, 1) AS coach_alias
          from recruiter_has_industries as dig
            inner join users as regionals on regionals.id = dig.regional_director_id
            inner join personal_informations as regionalpi on regionalpi.id = regionals.personal_information_id
            inner join users as coaches on coaches.id = dig.coach_id
            inner join personal_informations as coachpi on coachpi.id = coaches.personal_information_id
            inner join users as recruiters on recruiters.id = dig.recruiter_id
            inner join personal_informations as recruiterpi on recruiterpi.id = recruiters.personal_information_id
          where dig.coach_id is not null and dig.recruiter_id is not null and recruiters.user_status_id = 1
          group by recruiters.id, regional, coach, recruiter;`;
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
