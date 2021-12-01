'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')
const Database = use('Database');


class ContactsSchema extends Schema {
  up () {
    this.schedule(async (transaction) => {
      const createIndexes = `
        CREATE INDEX IF NOT EXISTS idx_contacts_company_id
            ON contacts_directory USING btree
            (company_id ASC NULLS LAST);
          
        CREATE INDEX IF NOT EXISTS idx_contacts_industry_id
            ON contacts_directory USING btree
            (industry_id ASC NULLS LAST);
          
        CREATE INDEX IF NOT EXISTS idx_contacts_specialty_id
            ON contacts_directory USING btree
            (specialty_id ASC NULLS LAST);
          
        CREATE INDEX IF NOT EXISTS idx_contacts_subspecialty_id
            ON contacts_directory USING btree
            (subspecialty_id ASC NULLS LAST);
          
        CREATE INDEX  IF NOT EXISTS idx_contacts_functional_title_id
            ON contacts_directory USING btree
            (position_id ASC NULLS LAST);

        CREATE INDEX IF NOT EXISTS idx_contacts_country_id
            ON contacts_directory USING btree
            (country_id ASC NULLS LAST);

        CREATE INDEX IF NOT EXISTS idx_contacts_state_id
            ON contacts_directory USING btree
            (state_id ASC NULLS LAST);
          
        CREATE INDEX IF NOT EXISTS idx_contacts_city_id
            ON contacts_directory USING btree
            (city_id ASC NULLS LAST);

        CREATE INDEX IF NOT EXISTS idx_contacts_company_id
            ON contacts_directory USING btree
            (company_id ASC NULLS LAST);
          
        CREATE INDEX IF NOT EXISTS idx_contacts_industry_id
            ON contacts_directory USING btree
            (industry_id ASC NULLS LAST);
          
        CREATE INDEX IF NOT EXISTS idx_contacts_specialty_id
            ON contacts_directory USING btree
            (specialty_id ASC NULLS LAST);
          
        CREATE INDEX IF NOT EXISTS idx_contacts_subspecialty_id
            ON contacts_directory USING btree
            (subspecialty_id ASC NULLS LAST);
          
        CREATE INDEX IF NOT EXISTS idx_contacts_functional_title_id
            ON contacts_directory USING btree
            (position_id ASC NULLS LAST);

        CREATE INDEX IF NOT EXISTS idx_contacts_country_id
            ON contacts_directory USING btree
            (country_id ASC NULLS LAST);

        CREATE INDEX IF NOT EXISTS idx_contacts_state_id
            ON contacts_directory USING btree
            (state_id ASC NULLS LAST);
          
        CREATE INDEX IF NOT EXISTS idx_contacts_city_id
            ON contacts_directory USING btree
            (city_id ASC NULLS LAST);

        CREATE INDEX IF NOT EXISTS idx_contacts_current_company
            ON contacts_directory USING btree
            (current_company ASC NULLS LAST);
      `;
      try {
        await Database.raw(createIndexes).transacting(transaction);
        await transaction.commit();
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    });
  }

  down () {
    
  }
}

module.exports = ContactsSchema
