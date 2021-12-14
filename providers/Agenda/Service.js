'use strict';

const Agenda = require('agenda');
const Helpers = use('Helpers');
const { JobNames } = use('App/Scheduler/Constants');

class AgendaService {
  constructor(Config, section = 'inventory') {
    if (Helpers.isAceCommand()) return null;

    try {
      const isAgendaEnabled = Config.get(`agenda.${section}.enable`);
      if (!isAgendaEnabled) return null;

      console.log('Creating Agenda for ', section);
      const connectionOptions = Config.get(`agenda.${section}.connection`);
      const jobsToProcessEntry = Config.get(`agenda.${section}.jobsToProcess`);
      const jobsToProcess = jobsToProcessEntry ? jobsToProcessEntry.split('|') : [];

      const agenda = new Agenda(connectionOptions);
      //defaultLockLifetime Takes a number which specifies the default lock lifetime in milliseconds. By default it is 10 minutes
      //See https://github.com/agenda/agenda#defaultlocklifetimenumber
      agenda.defaultLockLifetime(30000);//Extended to 30 minutes for the migration jobs.
      jobsToProcess.forEach((job) => {
        job && require('../../app/Scheduler/Jobs/' + job)(agenda);
      });

      agenda.on('ready', async () => {
        console.log('Connection to Agenda is ready');

        if (jobsToProcess.length) {
          console.log('Processing ', jobsToProcess, 'jobs');
          agenda.start().then().catch(e => console.log(e));
        }

        const singleTasks = Config.get(`agenda.${section}.singleTasks`);
        if(singleTasks) {
          for (const task of singleTasks) {
            console.log('registering', task.name, 'to run every', task.frequency)
            agenda.every(task.frequency, task.name, task.data, {
              timezone: Config.get(`agenda.defaultTimezone`),
            }).then().catch(error => console.log(error));
          }
        }
      });

      return agenda;
    } catch (error) {
      console.log(error);
    }
  }
}

module.exports = AgendaService;
