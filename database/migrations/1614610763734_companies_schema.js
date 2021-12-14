'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class CompaniesSchema extends Schema {
  up () {
    this.raw(`
      create materialized view v_specialties as
        SELECT spec.id,
          spec.title AS title,
          ind.id AS industry_id,
          ind.title AS industry
          FROM specialties spec
            JOIN industries ind ON ind.id = spec.industry_id
        ORDER BY ind.id, spec.id
    `);

    this.raw(`
    create materialized view v_users as
      SELECT
        users.id,
        users.initials,
        users.user_status_id,
        users.email AS user_email,
        pi_recruiter.full_name AS user_name,
        dig.recruiter_id,
        dig.coach_id,
        coach.email AS coach_email,
        pi_coach.full_name AS coach_name,
        dig.regional_director_id AS regional_id,
        regional.email AS regional_email,
        pi_regional.full_name AS regional_full_name 
      FROM
        users 
        left join
            (
              SELECT DISTINCT
                  recruiter_has_industries.recruiter_id,
                  recruiter_has_industries.coach_id,
                  recruiter_has_industries.regional_director_id 
              FROM
                  recruiter_has_industries
            )
            as dig 
            on users.id = dig.recruiter_id 
        left JOIN
            users coach 
            ON coach.id = dig.coach_id 
        left JOIN
            users regional 
            ON regional.id = dig.regional_director_id 
        left JOIN
            personal_informations pi_recruiter 
            ON pi_recruiter.id = users.personal_information_id 
        left JOIN
            personal_informations pi_coach 
            ON pi_coach.id = coach.personal_information_id 
        left JOIN
            personal_informations pi_regional 
            ON pi_regional.id = regional.personal_information_id 
      order by
        users.id
    `);

    this.raw(`
    create materialized view v_cities as
      SELECT cty.id AS id,
        cty.title,
        st.id AS state_id,
        st.title AS state,
        st.slug AS state_slug,
        coty.id AS country_id,
        coty.title AS country,
        coty.slug AS country_slug
        FROM cities cty
          JOIN states st ON cty.state_id = st.id
          JOIN countries coty ON st.country_id = coty.id
      ORDER BY coty.id, st.id, cty.id
    `);
  }

  down () {
    this.table('companies', (table) => {
      // reverse alternations
    })
  }
}

module.exports = CompaniesSchema
