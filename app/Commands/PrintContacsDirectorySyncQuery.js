'use strict'

const { Command } = require('@adonisjs/ace')
const NameDirectoryUpdater = use('App/Helpers/NameDirectoryUpdater');
const CandidateDirectoryUpdater = use('App/Helpers/CandidateDirectoryUpdater');
const HiringAuthorityDirectoryUpdater = use('App/Helpers/HiringAuthorityDirectoryUpdater');
class PrintContacsDirectorySyncQuery extends Command {
  static get signature () {
    return 'print:contacts:query  {--type=@value}'
  }

  static get description () {
    return 'This command prints SQL queries to synchronize contacts_directory table'
  }

  async handle (args, options) {
    const {type} = options;
    if (type == 'sync') {
      this.printSynchronizationQueries();
    } else if (type == 'updateAll') {
      this.printUpdateQueries();
    }
  }

  printSynchronizationQueries() {
    const nameDirectoryUpdater = new NameDirectoryUpdater();
    console.log(nameDirectoryUpdater.getSynchronizationQuery());
    console.log('===============================================================');
    console.log('');
    const candidateDirectoryUpdater = new CandidateDirectoryUpdater();
    console.log(candidateDirectoryUpdater.getSynchronizationQuery());
    console.log('===============================================================');
    console.log('');
    const hiringAuthorityDirectoryUpdater = new HiringAuthorityDirectoryUpdater();
    console.log(hiringAuthorityDirectoryUpdater.getSynchronizationQuery());
  }

  printUpdateQueries() {
    const nameDirectoryUpdater = new NameDirectoryUpdater();
    console.log(nameDirectoryUpdater.getUpdateAllQuery());
    console.log('===============================================================');
    console.log('');
    const candidateDirectoryUpdater = new CandidateDirectoryUpdater();
    console.log(candidateDirectoryUpdater.getUpdateAllQuery());
    console.log('===============================================================');
    console.log('');
    const hiringAuthorityDirectoryUpdater = new HiringAuthorityDirectoryUpdater();
    console.log(hiringAuthorityDirectoryUpdater.getUpdateAllQuery());
  }
}

module.exports = PrintContacsDirectorySyncQuery
