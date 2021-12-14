// Utils
const { JobNames } = use('App/Scheduler/Constants');
const appInsights = use('applicationinsights');
const ResultMigrationEmail = new (use('App/Emails/ResultMigrationEmail'))();
const { thereIsAnExistingRun, processPending, canProcessPending, purgeIdleProcess }  = use('App/Helpers/Migration/MigrationUtils');
const Database = use('Database');

// Repositories
const SearchProjectMigrationRepository =  use('App/Helpers/Migration/SearchProjectMigrationRepository');
const CompanyMigrationRepository = use('App/Helpers/Migration/CompanyMigrationRepository');
const ContactsMigrationRepository = use('App/Helpers/Migration/ContactsMigrationRepository');
const UserRepository = new (use('App/Helpers/UserRepository'))();
const MigrationValidationRepository = new (use('App/Helpers/Migration/MigrationValidationRepository'))();

module.exports = (agenda) => {
  agenda.define(JobNames.Migrations.SearchProject, async (job) => {
    const { id } = job.attrs.data;
    try {
      if(await thereIsAnExistingRun(id)){
        return;
      }
      const searchProjectMigrationRepository = new SearchProjectMigrationRepository();
      await Database.table('migrations').where('id', id).update({ status: 'in-progress' });
      const result = await searchProjectMigrationRepository.processMigration(id);
      if(!result.success){
        throw result.error;
      }
      const { errorsFound, searchProjectMigration,  successUploads, searchProjectResult} = result;
      await Database.table('migrations').where('id', id).update({ items_processed: successUploads.length, items_error: errorsFound.length, status: 'completed' });
      const recruiterData = await UserRepository.getDetails(searchProjectResult.data.created_by);
      await ResultMigrationEmail.send(searchProjectMigration, errorsFound, [], `RollUp (${searchProjectResult.data.name}) for ${recruiterData.full_name}`, successUploads);
      if(!searchProjectMigration.is_high_priority && await canProcessPending()){
        await processPending();
      }
    } catch (error) {
      await Database.table('migrations').where('id', id).update({ status: 'error' });
      appInsights.defaultClient.trackException({ exception: `${error} for ${job}` });
    }
    await agenda.cancel({
      name: JobNames.Migrations.SearchProject,
      'data.id': id,
    });
  });

  agenda.define(JobNames.Migrations.Company, async (job) => {
    const { id } = job.attrs.data;
    try {
      if(await thereIsAnExistingRun(id)){
        return;
      }
      const companyMigrationRepository = new CompanyMigrationRepository();
      await Database.table('migrations').where('id', id).update({ status: 'in-progress' });
      const result = await companyMigrationRepository.processMigration(id);
      if(!result.success){
        throw result.error;
      }
      const { errorsFound, companyMigration, contacts, successUploads } = result;
      await Database.table('migrations').where('id', id).update({ items_processed: successUploads.length, items_error: errorsFound.length, status: 'completed' });
      await ResultMigrationEmail.send(companyMigration, errorsFound, contacts, 'Companies', successUploads);
      if(!companyMigration.is_high_priority && await canProcessPending()){
        await processPending();
      }
    } catch (error) {
      await Database.table('migrations').where('id', id).update({ status: 'error' });
      appInsights.defaultClient.trackException({ exception: `${error} for ${job}` });
    }
    await agenda.cancel({
      name: JobNames.Migrations.Company,
      'data.id': id,
    });
  });

  agenda.define(JobNames.Migrations.Contacts, async (job) => {
    const { id } = job.attrs.data;
    try {
      if(await thereIsAnExistingRun(id)){
        return;
      }
      const contactsMigrationRepository = new ContactsMigrationRepository();
      await Database.table('migrations').where('id', id).update({ status: 'in-progress' });
      const result = await contactsMigrationRepository.processMigration(id);
      if(!result.success){
        throw result.error;
      }
      const { errorsFound, contactsMigration, successUploads } = result;
      await Database.table('migrations').where('id', id).update({ items_processed: successUploads.length, items_error: errorsFound.length, status: 'completed' });
      await ResultMigrationEmail.send(contactsMigration, errorsFound, [], 'Contacts', successUploads);
      if(!contactsMigration.is_high_priority && await canProcessPending()){
        await processPending();
      }
    } catch (error) {
      await Database.table('migrations').where('id', id).update({ status: 'error' });
      appInsights.defaultClient.trackException({ exception: `${error} for ${job}` });
    }
    await agenda.cancel({
      name: JobNames.Migrations.Contacts,
      'data.id': id,
    });
  });

  agenda.define(JobNames.Migrations.ProcessPending, async (job) => {
    try {
      await purgeIdleProcess();
      if(!await canProcessPending()){
        return;
      }
      await processPending();
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: `${error} for ${job}` });
    }
  });

  agenda.define(JobNames.Migrations.EmailValidation, async (job) => {
    try {
      const { migrationId } = job.attrs.data;
      await MigrationValidationRepository.checkMigrationEmailsListState(migrationId);
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
    }
  });
};
