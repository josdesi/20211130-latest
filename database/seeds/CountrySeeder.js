'use strict'

/*
|--------------------------------------------------------------------------
| CountrySeeder
|--------------------------------------------------------------------------
|
| Make use of the Factory instance to seed database with dummy data or
| make use of Lucid models directly.
|
*/

/** @type {import('@adonisjs/lucid/src/Factory')} */
const Factory = use('Factory')
const Database = use('Database')

class CountrySeeder {
  static async run () {
    const data = [
      { id: 1, title: 'United States of America', slug: 'US' },
      { id: 2, title: 'Canada', slug: 'CA' },
      { id: 3, title: 'Mexico', slug: 'MX' },
      { id: 4, title: 'United Kingdom', slug: 'UK' },
    ]
    await Database.table('countries').insert(data)
    await Database.raw("SELECT setval('countries_id_seq',?, true)",[data.length])
  }
}

module.exports = CountrySeeder
