'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');

class DirectoryViewSchema extends Schema {
  up() {
    // Name:0
    // Candidate:1
    // HiringAuthority:2
    this.raw(`
      CREATE OR REPLACE VIEW directory AS
     (
        (
          select    
            nm.id,
            pi_nm.first_name,
            pi_nm.last_name,
            pi_nm.full_name,
            nm.specialty_id,
            nm.subspecialty_id,
            nm.position_id,
            nm.source_type_id,
            0 as name_type_id,
            nm.name_status_id,
            nm_status.title as status_title,
            nm.email,
            nm.link_profile,
            nm.title,
            nm.current_company,
            nm.created_at,
            nm.updated_at
          from names as nm
          inner join personal_informations as pi_nm on nm.personal_information_id = pi_nm.id
          inner join name_statuses as nm_status on nm.name_status_id = nm_status.id
          where nm.convertion_date is null
        )
        union
        (
          select ha.id,
            ha.first_name,
            ha.last_name,
            ha.full_name,
            ha.specialty_id,
            ha.subspecialty_id,
            ha.position_id as position_id,
            null as source_type_id,
            2  as name_type_id,
            ha.hiring_authority_status_id as name_status_id,
            ha_status.title as status_title,
            ha.personal_email   as email,
            null  as link_profile,
            ha.title,
            companies.name as current_company,
            ha.created_at,
            ha.updated_at
          from hiring_authorities as ha
          inner join companies on ha.company_id = companies.id
          left join hiring_authority_statuses as ha_status on ha.hiring_authority_status_id = ha_status.id
        )
        union
        (
          select ca.id,
            pi_ca.first_name,
            pi_ca.last_name,
            pi_ca.full_name,
            ca.specialty_id,
            ca.subspecialty_id,
            ca.position_id,
            ca.source_type_id,
            1  as name_type_id,
            ca.status_id as name_status_id,
            ca_type.title as status_title,
            ca.email,
            ca.link_profile,
            ca.title,
            ca.current_company,
            ca.created_at,
            ca.updated_at
          from candidates as ca
          inner join personal_informations as pi_ca on ca.personal_information_id = pi_ca.id
		      inner join blue_sheets as bsht on ca.id = bsht.candidate_id
          inner join candidate_types as ca_type on bsht.candidate_type_id = ca_type.id
        )
      )
    `);
  }
}

module.exports = DirectoryViewSchema;
