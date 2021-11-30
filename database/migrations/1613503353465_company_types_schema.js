'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')
const Database = use('Database')
const {companyType, jobOrderType} = use('App/Helpers/Globals');
class CompanyTypesSchema extends Schema {
  up () {
    this.table('company_types', (table) => {
      // alter table
    })

    this.schedule(async (transaction) => {
      const setNotSigned = `
        UPDATE companies SET company_type_id = ${companyType.NotSigned} WHERE companies.company_type_id IS NULL
      `;

      const setVendorsQuery = `
      UPDATE companies SET company_type_id = ${companyType.Vendor}
      WHERE
        (companies.company_type_id = ${companyType.NotSigned} OR companies.company_type_id IS NULL)
        AND (signed = 1 OR companies.fee_agreement_url IS NOT NULL)
        AND NOT exists(
          SELECT * FROM job_orders WHERE exists(SELECT * FROM  white_sheets WHERE white_sheets.job_order_id = job_orders.id AND white_sheets.job_order_type_id = ${jobOrderType.PLACEMENT})
          AND job_orders.company_id = companies.id
        )
      `;

      const setClientsQuery = `
      UPDATE companies SET company_type_id = ${companyType.Client}
      WHERE
        (companies.company_type_id = ${companyType.NotSigned} OR companies.company_type_id = ${companyType.Vendor} OR companies.company_type_id IS NULL)
        AND (signed = 1 OR companies.fee_agreement_url IS NOT NULL)
        AND exists(
          SELECT * FROM job_orders WHERE exists(SELECT * FROM white_sheets WHERE white_sheets.job_order_id = job_orders.id AND white_sheets.job_order_type_id = ${jobOrderType.PLACEMENT})
          AND job_orders.company_id = companies.id
        )
      `;

      try {
        await Database.raw(setNotSigned).transacting(transaction);
        await Database.raw(setVendorsQuery).transacting(transaction);
        await Database.raw(setClientsQuery).transacting(transaction);
        await transaction.commit();
      } catch(error) {
        await transaction.rollback();
        throw error;
      }



    });
  }

  down () {
    this.table('company_types', (table) => {
      // reverse alternations
    })
  }
}

module.exports = CompanyTypesSchema
