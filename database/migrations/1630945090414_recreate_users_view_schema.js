'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')
const Database = use('Database');

class RecreateUsersViewSchema extends Schema {
  up () {
    this.schedule(async (transaction) => {
      const createView = `
        CREATE MATERIALIZED VIEW v_users
          AS
            SELECT users.id,
              users.initials,
              users.user_status_id,
              users.email AS user_email,
              users.personal_information_id,
              users.job_title,
              users.email_signature,
              users.start_date,
              pi_recruiter.full_name AS user_name,
              dig.recruiter_id,
              COALESCE(dig.coach_id, coaches.coach_id) AS coach_id,
              COALESCE(coach.email, only_coaches.email) AS coach_email,
              COALESCE(pi_coach.full_name, pi_only_coaches.full_name) AS coach_name,
              dig.regional_director_id AS regional_id,
              regional.email AS regional_email,
              pi_regional.full_name AS regional_full_name,
              users.manager_id,
              pi_manager.full_name AS manager_full_name,
              channel.id as channel_id,
              pi_channel.full_name as channel_full_name
            FROM users
              LEFT JOIN ( SELECT DISTINCT recruiter_has_industries.recruiter_id,
                      recruiter_has_industries.coach_id,
                      recruiter_has_industries.regional_director_id
                    FROM recruiter_has_industries
                    WHERE recruiter_has_industries.coach_id IS NOT NULL AND recruiter_has_industries.regional_director_id IS NOT NULL) dig ON users.id = dig.recruiter_id
              LEFT JOIN ( SELECT DISTINCT recruiter_has_industries.coach_id
                    FROM recruiter_has_industries
                    WHERE recruiter_has_industries.coach_id IS NOT NULL) coaches ON users.id = coaches.coach_id
              LEFT JOIN users coach ON coach.id = dig.coach_id
              LEFT JOIN users only_coaches ON only_coaches.id = coaches.coach_id
              LEFT JOIN users regional ON regional.id = dig.regional_director_id
              LEFT JOIN personal_informations pi_recruiter ON pi_recruiter.id = users.personal_information_id
              LEFT JOIN personal_informations pi_coach ON pi_coach.id = coach.personal_information_id
              LEFT JOIN personal_informations pi_only_coaches ON pi_only_coaches.id = only_coaches.personal_information_id
              LEFT JOIN personal_informations pi_regional ON pi_regional.id = regional.personal_information_id
              LEFT JOIN users managers ON managers.id = users.manager_id
              LEFT JOIN personal_informations pi_manager ON pi_manager.id = managers.personal_information_id
              LEFT JOIN channel_partners as chpnr ON users.id = chpnr.referee_id
              LEFT JOIN users as channel ON chpnr.referral_id = channel.id
              LEFT JOIN personal_informations as pi_channel ON channel.personal_information_id = pi_channel.id
            ORDER BY users.id
          WITH DATA;`;
      const userIndex = 'CREATE UNIQUE INDEX v_users_unique_idx ON v_users USING btree (id);';
      try {
        await Database.raw(createView).transacting(transaction);
        await Database.raw(userIndex).transacting(transaction);
        await transaction.commit();
      } catch(error) {
        await transaction.rollback();
        throw error;
      }
    });
  }
}

module.exports = RecreateUsersViewSchema
