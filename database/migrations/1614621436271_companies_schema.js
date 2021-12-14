'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')
const Database = use('Database')

class CompaniesSchema extends Schema {
  up () {
    this.schedule(async (transaction) => {
      const moveAddressesQuery = `
      update
            companies c
        set
            address = a.address, city_id = a.city_id, coordinates = a.coordinates, zip = a.zip 
        from
            addresses a 
        where
            address_id = a.id 
            and c.city_id is null;
      `;

      await Database.raw(moveAddressesQuery).transacting(transaction);

    });
  }

  down () {
    this.table('companies', (table) => {
      // reverse alternations
    })
  }
}

module.exports = CompaniesSchema
