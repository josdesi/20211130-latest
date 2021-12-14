const DirectoryUpdater = use('App/Helpers/DirectoryUpdater');
const { nameTypes } = use('App/Helpers/Globals');
const Database = use('Database');
/**
 * DirectoryUpdater implementation for HiringAithority
 * This class is responsible for update the directory information for hiring authorities.
 */
class HiringAuthorityDirectoryUpdater extends DirectoryUpdater {
  constructor() {
    super();
    this.nameType = nameTypes.HiringAuthority;
    this.companiesPerHiringAuthorityQuery = `
      select  hiring_authority_id , company_id from hiring_authority_has_companies
      union
      select id as hiring_authority_id, company_id from hiring_authorities ha 
      where company_id is not null`;
    this.directoryInformationQuery = `
    SELECT
      concat('${this.nameType}', '-', ha.id::text) as id,
      ha.id as origin_table_id,
      ha.first_name as first_name,
      ha.last_name as last_name,
      ha.full_name as full_name,
      cp.recruiter_id,
      pi_recruiters.full_name as recruiter_name,
      cp.id as company_id,
      cp.name as company,
      cp_types.id as company_type_id,
      cp_types.title as company_type,
      cp_types.color as company_type_color,
      spec.industry_id as industry_id,
      spec.industry as industry,
      ha.specialty_id as specialty_id,
      spec.title as specialty,
      ha.subspecialty_id as subspecialty_id,
      subspec.title as subspecialty,
      ha.position_id as position_id,
      pos.title as position,
      NULL::integer AS source_type_id,
      NULL as source,
      2 AS role_id,
      nm_type.title as role,

      null::integer AS type_id,
      null AS type,
      null AS type_color,

      city.country as country,
      city.country_slug as country_slug,
      city.country_id as country_id,

      city.state as state,
      city.state_slug as state_slug,
      city.state_id as state_id,

      city.title as city,
      city.id as city_id,

      cp.zip as zip,
      city.title || ', ' || city.state_slug as location,
      COALESCE(
        ST_MakePoint(cp.coordinates[0], cp.coordinates[1])::geography,
        (SELECT ST_MakePoint(zips.longitude, zips.latitude)::geography FROM zip_codes zips where zips.zip_ch = cp.zip LIMIT 1)
        ) as coordinates,
      spec.industry || ': ' || spec.title as industry_specialty,

      nme_status.id as status_id,
      ha_status.title as status,
      null as status_color,

      act.created_at as last_activity_date,
      act.user_name as last_activity_recruiter,
      act.title as last_activity_title,

      ha.work_email AS email,
      ha.personal_email AS personal_email,
      ha.work_phone AS phone,
      ha.personal_phone AS mobile,
      NULL::character varying AS link_profile,
      ha.title as title,
      cp.name AS current_company,
      concat(ha.full_name, ' ', cp.name, ' ', ha.work_email, ' ', ha.personal_email) as searchable_text,
      ha.created_at as created_at,
      ha.updated_at as updated_at
    FROM hiring_authorities ha
    LEFT JOIN hiring_authority_statuses ha_status ON ha.hiring_authority_status_id = ha_status.id
    LEFT JOIN v_specialties spec ON spec.id = ha.specialty_id
    LEFT JOIN subspecialties subspec ON subspec.id = ha.subspecialty_id
    LEFT JOIN positions pos ON pos.id = ha.position_id
    LEFT JOIN name_types nm_type ON nm_type.id = 2
    LEFT JOIN companies cp  ON cp.id = ha.company_id
    LEFT JOIN name_statuses nme_status ON nme_status.original_table_id = ha.hiring_authority_status_id AND nme_status.name_type_id = 2
    LEFT JOIN v_cities city ON city.id = cp.city_id 
    LEFT JOIN company_types cp_types ON cp_types.id = cp.company_type_id
    LEFT JOIN users recruiters ON recruiters.id = cp.recruiter_id
    LEFT JOIN personal_informations pi_recruiters ON pi_recruiters.id = recruiters.personal_information_id
    LEFT JOIN hiring_authority_last_activity_logs as act on act.hiring_authority_id = ha.id
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
      ) as directory_information_query`;

  }

  /**
   * Updates or creates all the directory informations of hiring authorities from a specific company.
   * @param {number} companyId the id of the company
   * @returns
   */
  async updateDirectoryInformationByCompany(companyId) {
    try{
      const hiringAuthorities = await Database.table('hiring_authorities')
        .select(['id'])
        .whereRaw('hiring_authorities.company_id = :company_id or id in (select hiring_authority_id from hiring_authority_has_companies where company_id = :company_id)', {company_id: companyId});
      const hiringAuthoritiesIds = hiringAuthorities.map(({id}) => id);
      return await Promise.all(hiringAuthoritiesIds.map(id => this.updateOrCreateDirectoryInformation(id)));
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
  /**
   *
   * @param {*} id
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
            ${this.directoryInformationQuery} WHERE ha.id = :hiring_authority_id
          ) as directory_information_query
          WHERE contacts_directory.id = :directory_information_id
        `;
        await Database.raw(updateQuery, { directory_information_id: directoryInformationId, hiring_authority_id: id });
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
      WHERE ha.id = :id
      `;
        await Database.raw(insertQuery, { id });
      }

  }

  /**
   * Deltes the directory information for a specific HiringAuthority
   * @param {*} id Id of the hiring authority.
   */

  async deleteDirectoryInformation(id) {
    const directoryInformationId = this.getDirectoryInformationId(id);
    await Database.table('contacts_directory').where('id', directoryInformationId).delete();
  }

  /**
   * Creates all the missing directory informations for the existent Hiring Authorities
   * @param {Knex Transaction} externalTransaction
   */
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
      source,
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
    WHERE NOT EXISTS(SELECT * FROM contacts_directory WHERE id = concat('${this.nameType}', '-', ha.id::text))
    `;
    return indexQuery;
  }

  getUpdateAllQuery() {
    return `
    ${this.updateQuery}
    WHERE contacts_directory.id ilike '${this.nameType}-%' and directory_information_query.origin_table_id = contacts_directory.origin_table_id`;
  }
}

module.exports = HiringAuthorityDirectoryUpdater;
