'use strict'

const { Command } = require('@adonisjs/ace')
const CandidateSearchInformationUpdater = use('App/Helpers/Search/Updater/CandidateSearchInformationUpdater');
const JobOrderSearchInformationUpdater = use('App/Helpers/Search/Updater/JobOrderSearchInformationUpdater');
const CompanySearchInformationUpdater = use('App/Helpers/Search/Updater/CompanySearchInformationUpdater');
class PrintSearchInformationUpdateQuery extends Command {
  static get signature () {
    return 'print:search:information:update:query'
  }

  static get description () {
    return 'Prints search information update query for every entity that has search information'
  }

  async handle (args, options) {
    const candidateSearchInformationUpdater = new CandidateSearchInformationUpdater();
    const jobOrderSearchInformationUpdater = new JobOrderSearchInformationUpdater();
    const companySearchInformationUpdater = new CompanySearchInformationUpdater();
    console.log('CANDIDATES:');
    console.log(candidateSearchInformationUpdater.getUpdateAllQuery());
    console.log('JOB ORDERS:');
    console.log(jobOrderSearchInformationUpdater.getUpdateAllQuery());
    console.log('COMPANIES: ');
    console.log(companySearchInformationUpdater.getUpdateAllQuery());
  }
}

module.exports = PrintSearchInformationUpdateQuery
