'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class DirectoryViewSchema extends Schema {
  up () {
    this.raw(`
    CREATE OR REPLACE VIEW directory AS
    (
        select names.id,
               personal_informations.first_name,
               personal_informations.last_name,
               personal_informations.full_name,
               specialty_id,
               subspecialty_id,
               position_id,
               source_type_id,
               0 as name_type_id,
               name_status_id,
               name_statuses.title as status_title,
               email,
               link_profile,
               names.title,
               current_company,
               names.created_at,
               names.updated_at
        from names
        inner join personal_informations on personal_informations.id = names.personal_information_id
        inner join name_statuses on name_status_id = name_statuses.id
        where convertion_date is null
        union
        select hiring_authorities.id,
               hiring_authorities.first_name,
               hiring_authorities.last_name,
               hiring_authorities.full_name,
               hiring_authorities.specialty_id,
               hiring_authorities.subspecialty_id,
               hiring_authorities.position_id                as position_id,
               null                                          as source_type_id,
               2                                             as name_type_id,
               hiring_authorities.hiring_authority_status_id as name_status_id,
               hiring_authority_statuses.title               as status_title,
               personal_email                                as email,
               null                                          as link_profile,
               hiring_authorities.title,
               companies.name                                as current_company,
               hiring_authorities.created_at,
               hiring_authorities.updated_at
        from hiring_authorities
        inner join companies on hiring_authorities.company_id = companies.id
        inner join hiring_authority_statuses on hiring_authorities.hiring_authority_status_id = hiring_authority_statuses.id
        union
        select candidates.id,
               personal_informations.first_name,
               personal_informations.last_name,
               personal_informations.full_name,
               specialty_id,
               subspecialty_id,
               position_id,
               source_type_id,
               1                    as name_type_id,
               candidates.status_id as name_status_id,
               candidate_statuses.title as status_title,
               email,
               link_profile,
               candidates.title,
               current_company,
               candidates.created_at,
               candidates.updated_at
        from candidates
        inner join personal_informations on candidates.personal_information_id = personal_informations.id
        inner join candidate_statuses on candidates.status_id = candidate_statuses.id
    )
    `);
  }

  down () {
    
  }
}

module.exports = DirectoryViewSchema
