'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class ContactsDirectorySchema extends Schema {
  up () {
    this.raw(`
    create table contacts_directory (
      id varchar(45) primary key,
      origin_table_id integer,
      first_name varchar(255),
      last_name varchar(255),
      full_name varchar(255),
      company_id integer references companies(id),
      company varchar(255),
      industry_id integer references industries(id),
      industry varchar(255),
      specialty_id integer,
      specialty varchar(255),
      subspecialty_id integer references subspecialties(id),
      subspecialty varchar(255),
      position_id integer references positions(id),
      position varchar(255),
      source_type_id integer references source_types(id),
      source_type varchar(255),
      source varchar(255),
      role_id integer references name_types(id),
      role varchar(255),
      role_color varchar(30),
      type_id integer references name_entity_types(id),
      type varchar(255),
      type_color varchar(30),
      status_id integer references name_statuses(id),
      status varchar(255),
      status_color varchar(30),
      email varchar(255),
      link_profile varchar(512),
      title varchar(255),
      current_company varchar(255),
      created_at timestamp,
      updated_at timestamp
    );

    create index idx_full_name_contacts_directory_desc_nulls_last on contacts_directory(full_name desc nulls last);
    create index idx_full_name_contacts_directory_desc_nulls_first on contacts_directory(full_name desc nulls first);
    create index idx_full_name_contacts_directory_asc_nulls_last on contacts_directory(full_name asc nulls last);
    create index idx_full_name_contacts_directory_asc_nulls_first on contacts_directory(full_name asc nulls first);

    create index idx_company_contacts_directory_desc_nulls_last on contacts_directory(company desc nulls last);
    create index idx_company_contacts_directory_desc_nulls_first on contacts_directory(company desc nulls first);
    create index idx_company_contacts_directory_asc_nulls_last on contacts_directory(company asc nulls last);
    create index idx_company_contacts_directory_asc_nulls_first on contacts_directory(company asc nulls first);
    `);
  }

  down () {
    this.drop('contacts_directories')
  }
}

module.exports = ContactsDirectorySchema
