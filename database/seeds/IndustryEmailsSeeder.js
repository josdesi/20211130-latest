'use strict';

const { userRoles } = use('App/Helpers/Globals');

/*
|--------------------------------------------------------------------------
| IndustryEmailsSeeder
|--------------------------------------------------------------------------
|
| Make use of the Factory instance to seed database with dummy data or
| make use of Lucid models directly.
|
*/

/** @type {import('@adonisjs/lucid/src/Factory')} */
const Factory = use('Factory');
const Database = use('Database');

// Models
const Industry = use('App/Models/Industry');

class IndustryEmailsSeeder {
  static async run(trx) {
    const data = [
      { industry: "Agriculture", email: "gpacagriculture@gogpac.com"},
      { industry: "Architecture", email: "gpacarchitecture@gogpac.com"},
      { industry: "Aviation", email: "gpacaviation@gogpac.com"},
      { industry: "Construction", email: "gpacconstruction@gogpac.com" },
      { industry: "Energy", email: "gpacenergy@gogpac.com" },
      { industry: "Engineering", email: "gpacengineering@gogpac.com" },
      { industry: "Healthcare", email: "gpachealthcare@gogpac.com" },
      { industry: "Manufacturing", email: "gpacmanufacturing@gogpac.com" },
      { industry: "Transportation", email: "gpactransportation@gogpac.com" },
      { industry: "Retail", email: "gpacretail@gogpac.com" },
      { industry: "Veterinary Services", email: "gpacveterinary@gogpac.com" },
      { industry: "Life Sciences", email: "gpaclifesciences@gogpac.com" },
      { industry: "Legal Services", email: "gpaclegalservices@gogpac.com" },
      { industry: "Real Estate", email: "gpacrealestate@gogpac.com" },
      { industry: "Information Technology", email: "gpacinformationtech@gogpac.com" },
      { industry: "Waste Management", email: "gpacwastemgmt@gogpac.com" },
      { industry: "Funeral Services", email: "gpacfuneralserv@gogpac.com" },
      { industry: "Marketing & Advertising", email: "gpacmarketing@gogpac.com" },
      { industry: "Multimedia", email: "gpacmultimedia@gogpac.com" },
      { industry: "Cannabis", email: "gpaccannabis@gogpac.com" },
      { industry: "Education", email: "gpaceducation@gogpac.com" },
      { industry: "Financial Services", email: "gpacfinance@gogpac.com" },
      { industry: "Hospitality", email: "gpachospitality@gogpac.com" },
      { industry: "Insurance", email: "gpacinsurance@gogpac.com" }
    ];

    for (const item of data) {
      if (await Industry.findBy({ title: item.industry })) {
        await Industry.query().where('title', item.industry).update({ email: item.email }, trx);
      }
      continue;
    }
  }
}

module.exports = IndustryEmailsSeeder;
