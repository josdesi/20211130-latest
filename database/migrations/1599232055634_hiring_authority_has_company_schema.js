'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');
const Database = use('Database');

class HiringAuthorityHasCompanySchema extends Schema {
  up () {
    this.schedule(async (transaction) => {
      const deleteDuplicatedHa = `
            DELETE FROM hiring_authority_has_companies
            WHERE id in 
                ( SELECT hc.id FROM hiring_authorities as ha 
                  inner join hiring_authority_has_companies as hc on 
                  ha.id = hc.hiring_authority_id and 
                  ha.company_id = hc.company_id
                );
        `;
      await Database.raw(deleteDuplicatedHa).transacting(transaction)
    })
  }

  down () {
  }
}

module.exports = HiringAuthorityHasCompanySchema
