const DirectoryUpdater = use('App/Helpers/DirectoryUpdater');
const { nameTypes } = use('App/Helpers/Globals');
const Database = use('Database');

/**
 * DirectoryUpdater implementation for Candidate
 */

class CandidateDirectoryUpdater extends DirectoryUpdater {
  constructor() {
    super();
    this.nameType = nameTypes.Candidate;
    this.directoryInformationQuery = `
    SELECT
      concat('${this.nameType}', '-', ca.id::text) as id,
      ca.id as origin_table_id,
      pi_ca.first_name as first_name,
      pi_ca.last_name as last_name,
      pi_ca.full_name as full_name,
      ca.recruiter_id,
      pi_recruiters.full_name as recruiter_name,
      cp.id as company_id,
      cp.name as company,
      cp_types.id as company_type_id,
      cp_types.title as company_type,
      cp_types.color as company_type_color,

      spec.industry_id as industry_id,
      spec.industry as industry,
      ca.specialty_id as specialty_id,
      spec.title as specialty,
      ca.subspecialty_id as subspecialty_id,
      subspec.title as subspecialty,
      ca.position_id as position_id,
      pos.title as position,
      ca.source_type_id as source_type_id,
      source.title as source,

      1 AS role_id,
      nm_type.title as role,

      nme_types.id AS type_id,
      ca_type.title AS type,
      ca_type.style_class_name as type_color,

      city.country as country,
      city.country_slug as country_slug,
      city.country_id as country_id,

      city.state as state,
      city.state_slug as state_slug,
      city.state_id as state_id,

      city.title as city,
      city.id as city_id,

      address.zip as zip,
      city.title || ', ' || city.state_slug as location,
      COALESCE(
        ST_MakePoint(address.coordinates[0], address.coordinates[1])::geography,
        ST_MakePoint(cp.coordinates[0], cp.coordinates[1])::geography,
        (SELECT ST_MakePoint(zips.longitude, zips.latitude)::geography FROM zip_codes zips where zips.zip_ch = address.zip LIMIT 1)
        ) as coordinates,
      spec.industry || ': ' || spec.title as industry_specialty,

      nme_status.id as status_id,
      ca_status.title as status,
      ca_status.style as status_color,

      act.created_at as last_activity_date,
      act.user_name as last_activity_recruiter,
      act.title as last_activity_title,

      ca.email as email,
      contact.personal_email as personal_email,
      contact.phone as phone,
      contact.mobile as mobile,
      ca.link_profile as link_profile,
      ca.title as title,
      ca.current_company as current_company,
      concat(pi_ca.full_name, ' ', ca.current_company, ' ', cp.name, ' ', ca.email,  ' ', contact.personal_email) as searchable_text,
      ca.created_at as created_at,
      ca.updated_at as updated_at
    FROM candidates ca
      JOIN personal_informations pi_ca ON ca.personal_information_id = pi_ca.id
      JOIN blue_sheets bsht ON ca.id = bsht.candidate_id
      JOIN candidate_types ca_type ON bsht.candidate_type_id = ca_type.id
      LEFT JOIN v_specialties spec ON spec.id = ca.specialty_id
      LEFT JOIN subspecialties subspec ON subspec.id = ca.subspecialty_id
      LEFT JOIN positions pos ON pos.id = ca.position_id
      LEFT JOIN source_types source ON source.id = ca.source_type_id
      LEFT JOIN name_types nm_type ON nm_type.id = 1
      LEFT JOIN (select distinct candidate_id, company_id from company_has_candidate_employees where is_current_company = true) as candidate_employees ON ca.id = candidate_employees.candidate_id
      LEFT JOIN companies cp ON cp.id = candidate_employees.company_id
      LEFT JOIN name_entity_types nme_types ON nme_types.original_table_id = bsht.candidate_type_id AND name_type_id = 1
      LEFT JOIN name_statuses nme_status ON nme_status.original_table_id = ca.status_id AND nme_status.name_type_id = 1
      LEFT JOIN candidate_statuses ca_status ON ca_status.id = ca.status_id
      LEFT JOIN addresses address ON address.id = pi_ca.address_id
      LEFT JOIN v_cities city ON city.id = address.city_id
      LEFT JOIN contacts contact ON contact.id = pi_ca.contact_id
      LEFT JOIN company_types cp_types ON cp_types.id = cp.company_type_id
      LEFT JOIN users recruiters ON recruiters.id = ca.recruiter_id
      LEFT JOIN personal_informations pi_recruiters ON pi_recruiters.id = recruiters.personal_information_id
      LEFT JOIN candidate_last_activity_logs as act on act.candidate_id = ca.id
    `;

    this.updateQuery = `
    UPDATE contacts_directory
    SET
      origin_table_id = directory_information_query.origin_table_id,
      first_name = directory_information_query.first_name,
      last_name = directory_information_query.last_name,
      full_name = directory_information_query.full_name,
      recruiter_id = directory_information_query.recruiter_id, 
      recruiter_name = directory_information_query.recruiter_name,
      company_id = directory_information_query.company_id, 
      company = directory_information_query.company,
      company_type_id = directory_information_query.company_type_id,
      company_type = directory_information_query.company_type,
      company_type_color = directory_information_query.company_type_color,
      industry_id = directory_information_query.industry_id,
      industry = directory_information_query.industry,
      specialty_id = directory_information_query.specialty_id,
      specialty = directory_information_query.specialty,
      subspecialty_id = directory_information_query.subspecialty_id,
      subspecialty = directory_information_query.subspecialty,
      position_id = directory_information_query.position_id,
      position = directory_information_query.position,
      source_type_id = directory_information_query.source_type_id,
      source = directory_information_query.source,
      role_id = directory_information_query.role_id,
      role = directory_information_query.role,

      type_id = directory_information_query.type_id,
      type = directory_information_query.type,
      type_color = directory_information_query.type_color,

      country = directory_information_query.country,
      country_slug = directory_information_query.country_slug,
      country_id = directory_information_query.country_id,

      state = directory_information_query.state,
      state_slug = directory_information_query.state_slug,
      state_id = directory_information_query.state_id,

      city = directory_information_query.city,
      city_id = directory_information_query.city_id,

      zip = directory_information_query.zip,
      location = directory_information_query.location,
      coordinates = directory_information_query.coordinates,
      industry_specialty = directory_information_query.industry_specialty,

      status_id = directory_information_query.status_id,
      status = directory_information_query.status,
      status_color = directory_information_query.status_color,

      last_activity_date = directory_information_query.last_activity_date,
      last_activity_recruiter = directory_information_query.last_activity_recruiter,
      last_activity_title = directory_information_query.last_activity_title,
      
      email = directory_information_query.email,
      personal_email = directory_information_query.personal_email,
      phone = directory_information_query.phone,
      mobile = directory_information_query.mobile,
      link_profile = directory_information_query.link_profile,
      title = directory_information_query.title,
      current_company = directory_information_query.current_company,
      searchable_text = directory_information_query.searchable_text,
      created_at = directory_information_query.created_at,
      updated_at = directory_information_query.updated_at
    FROM (
      ${this.directoryInformationQuery}
    ) as directory_information_query
    `;
  }

  /**
   * Updates or creates the directory information for a candidate given its id.
   * @param {number} id Id of the candidate to update directory information
   * @returns
   */
  async updateOrCreateDirectoryInformation(id) {
    const directoryInformationId = this.getDirectoryInformationId(id);
    const { count } = await Database.table('contacts_directory')
      .select([Database.raw('count(*) as count')])
      .where('id', directoryInformationId)
      .first();
    if (count > 0) {
      const updateQuery = `
      UPDATE contacts_directory
      SET
        origin_table_id = directory_information_query.origin_table_id,
        first_name = directory_information_query.first_name,
        last_name = directory_information_query.last_name,
        full_name = directory_information_query.full_name,
        recruiter_id = directory_information_query.recruiter_id, 
        recruiter_name = directory_information_query.recruiter_name,
        company_id = directory_information_query.company_id, 
        company = directory_information_query.company,
        company_type_id = directory_information_query.company_type_id,
        company_type = directory_information_query.company_type,
        company_type_color = directory_information_query.company_type_color,
        industry_id = directory_information_query.industry_id,
        industry = directory_information_query.industry,
        specialty_id = directory_information_query.specialty_id,
        specialty = directory_information_query.specialty,
        subspecialty_id = directory_information_query.subspecialty_id,
        subspecialty = directory_information_query.subspecialty,
        position_id = directory_information_query.position_id,
        position = directory_information_query.position,
        source_type_id = directory_information_query.source_type_id,
        source = directory_information_query.source,
        role_id = directory_information_query.role_id,
        role = directory_information_query.role,

        type_id = directory_information_query.type_id,
        type = directory_information_query.type,
        type_color = directory_information_query.type_color,

        country = directory_information_query.country,
        country_slug = directory_information_query.country_slug,
        country_id = directory_information_query.country_id,

        state = directory_information_query.state,
        state_slug = directory_information_query.state_slug,
        state_id = directory_information_query.state_id,

        city = directory_information_query.city,
        city_id = directory_information_query.city_id,

        zip = directory_information_query.zip,
        location = directory_information_query.location,
        coordinates = directory_information_query.coordinates,
        industry_specialty = directory_information_query.industry_specialty,

        status_id = directory_information_query.status_id,
        status = directory_information_query.status,
        status_color = directory_information_query.status_color,

        last_activity_date = directory_information_query.last_activity_date,
        last_activity_recruiter = directory_information_query.last_activity_recruiter,
        last_activity_title = directory_information_query.last_activity_title,
        
        email = directory_information_query.email,
        personal_email = directory_information_query.personal_email,
        phone = directory_information_query.phone,
        mobile = directory_information_query.mobile,
        link_profile = directory_information_query.link_profile,
        title = directory_information_query.title,
        current_company = directory_information_query.current_company,
        searchable_text = directory_information_query.searchable_text,
        created_at = directory_information_query.created_at,
        updated_at = directory_information_query.updated_at
      FROM (
        ${this.directoryInformationQuery} WHERE ca.id = :candidate_id
      ) as directory_information_query
      WHERE contacts_directory.id = :directory_information_id
        `;
      await Database.raw(updateQuery, { directory_information_id: directoryInformationId, candidate_id: id });
    } else {
      const insertQuery = `
        INSERT INTO contacts_directory (
          id,
          origin_table_id,
          first_name,
          last_name,
          full_name,
          recruiter_id,
          recruiter_name,
          company_id, 
          company,
          company_type_id,
          company_type,
          company_type_color,
          industry_id,
          industry,
          specialty_id,
          specialty,
          subspecialty_id,
          subspecialty,
          position_id,
          position,
          source_type_id,
          source_type,
          role_id,
          role,
    
          type_id,
          type,
          type_color,

          country,
          country_slug,
          country_id,
  
          state,
          state_slug,
          state_id,
  
          city,
          city_id,
          
          zip,
          location,
          coordinates,
          industry_specialty,
    
          status_id,
          status,
          status_color,

          last_activity_date,
          last_activity_recruiter,
          last_activity_title,

          email,
          personal_email,
          phone,
          mobile,
          link_profile,
          title,
          current_company,
          searchable_text,
          created_at,
          updated_at
        )
      ${this.directoryInformationQuery}
      WHERE ca.id = :id
      `;
      await Database.raw(insertQuery, { id });
    }
  }

  /**
   * Deletes directory information for a candidate given its id.
   * @param {number} id Id of the candidate is going to be deleted.
   */
  async deleteDirectoryInformation(id) {
    const directoryInformationId = this.getDirectoryInformationId(id);
    await Database.table('contacts_directory').where('id', directoryInformationId).delete();
  }

  async synchronizeAllUnSynchronized(externalTransaction) {
    const transaction = externalTransaction ? externalTransaction : await Database.beginTransaction();
    const isAtomic = transaction && !externalTransaction;
    try {
      const indexQuery = this.getSynchronizationQuery();
      await Database.raw(indexQuery).transacting(transaction);
      isAtomic && (await transaction.commit());
    } catch (error) {
      isAtomic && (await transaction.rollback());
      throw error;
    }
  }

  async updateAllExistents(externalTransaction) {
    const transaction = externalTransaction ? externalTransaction : await Database.beginTransaction();
    const isAtomic = transaction && !externalTransaction;
    try {
      const query = `
      ${this.updateQuery}
       WHERE contacts_directory.id ilike '${this.nameType}-%' and directory_information_query.origin_table_id = contacts_directory.origin_table_id
     `;
      await Database.raw(query).transacting(transaction);
      isAtomic && (await transaction.commit());
    } catch (error) {
      isAtomic && (await transaction.rollback());
      throw error;
    }
  }


  async refreshByForeignKey(foreignKey, value) {
    const instancesQueryResult = await Database
      .from('contacts_directory')
      .select('origin_table_id')
      .where(foreignKey, value)
      .where('role_id', this.nameType);
    const ids = instancesQueryResult.map(({origin_table_id}) => origin_table_id);
    return await this.updateOrCreateMultipleDirectoryInformation(ids);
  }


  getSynchronizationQuery() {
    const indexQuery = `
      INSERT INTO contacts_directory (
        id,
        origin_table_id,
        first_name,
        last_name,
        full_name,
        recruiter_id,
        recruiter_name,
        company_id, 
        company,
        company_type_id,
        company_type,
        company_type_color,
        industry_id,
        industry,
        specialty_id,
        specialty,
        subspecialty_id,
        subspecialty,
        position_id,
        position,
        source_type_id,
        source_type,
        role_id,
        role,
  
        type_id,
        type,
        type_color,

        country,
        country_slug,
        country_id,

        state,
        state_slug,
        state_id,

        city,
        city_id,
        
        zip,
        location,
        coordinates,
        industry_specialty,
  
        status_id,
        status,
        status_color,

        last_activity_date,
        last_activity_recruiter,
        last_activity_title,

        email,
        personal_email,
        phone,
        mobile,
        link_profile,
        title,
        current_company,
        searchable_text,
        created_at,
        updated_at
      )
      ${this.directoryInformationQuery}
      WHERE NOT EXISTS(SELECT * FROM contacts_directory WHERE id = concat('${this.nameType}', '-', ca.id::text))
      `;
      return indexQuery;
  }

  getUpdateAllQuery() {
    return `
    ${this.updateQuery}
    WHERE contacts_directory.id ilike '${this.nameType}-%' and directory_information_query.origin_table_id = contacts_directory.origin_table_id`;
  }
}

module.exports = CandidateDirectoryUpdater;
