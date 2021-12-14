'use strict'

/*
|--------------------------------------------------------------------------
| CandidateTypeSeeder
|--------------------------------------------------------------------------
|
| Make use of the Factory instance to seed database with dummy data or
| make use of Lucid models directly.
|
*/

/** @type {import('@adonisjs/lucid/src/Factory')} */
const Factory = use('Factory')
const Database = use('Database');
const CompanyType = use('App/Models/CompanyType');
class CompanyTypeSeeder {
  async run (externalTransaction) {
    const transaction = externalTransaction ? externalTransaction : await Database.beginTransaction();
    const isAtomic  = transaction && !externalTransaction;
    const companyTypes = [
      {id: 0, title: 'Signed', color: '#f39c12'},
      {id: 1, title: 'Client', color: '#27ae5f'},
      {id: 2, title: 'Not signed', color: '#9b9ea7'}
    ];
    
    try {
      for(const companyType of companyTypes) {
        const existentCompanyType = await CompanyType.find(companyType.id);
        if (existentCompanyType) {
          existentCompanyType.merge(companyType);
          await existentCompanyType.save(transaction);
          continue;
        }
        await CompanyType.create(companyType, transaction);
      }
      if (isAtomic) await transaction.commit();
    } catch(error) {
      console.log({error});
      if (isAtomic) await transaction.rollback();
    }
  }
}

module.exports = CompanyTypeSeeder