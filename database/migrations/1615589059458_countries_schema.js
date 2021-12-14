'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')
const Database = use('Database');
class CountriesSchema extends Schema {
  up () {
    this.table('countries', (table) => {
      table.boolean('available_for_recruiting');
    })

    this.schedule(async (transaction) => {
      try {
        await Database.table('countries').whereIn('id', [1,2]).update({available_for_recruiting: true}).transacting(transaction);
        await Database.table('countries').where('id', 3).update({available_for_recruiting: false}).transacting(transaction);
        await transaction.commit();
      } catch(error) {
        await transaction.rollback();
        throw error;
      }
    });
  }

  down () {
    this.table('countries', (table) => {
      // reverse alternations
    })
  }
}

module.exports = CountriesSchema
