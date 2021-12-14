'use strict';
//Utils
const appInsights = require('applicationinsights');

//Repositories
const HiringAuthorityDirectoryUpdater = new (use('App/Helpers/HiringAuthorityDirectoryUpdater'))();
const NameDirectoryUpdater = new (use('App/Helpers/NameDirectoryUpdater'))();
const MigrationValidationRepository = new (use('App/Helpers/Migration/MigrationValidationRepository'))();
const CompanySearchInformationUpdater = new (use('App/Helpers/Search/Updater/CompanySearchInformationUpdater'))();

const Migration = (module.exports = {
  synchronizeAllUnSynchronizedHirings: async () => {
    try {
      await HiringAuthorityDirectoryUpdater.synchronizeAllUnSynchronized();
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
    }
  },

  synchronizeAllUnSynchronizedNames: async () => {
    try {
      await NameDirectoryUpdater.synchronizeAllUnSynchronized();
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
    }
  },

  startMigrationEmailValidation: async ({ migrationId }) => {
    try {
      await MigrationValidationRepository.startMigrationEmailsValidation(migrationId);
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
    }
  },

  updateCompanyMissingSearchableTexts: async ({ migrationId }) => {
    try {
      await CompanySearchInformationUpdater.updateSearchInformationForeignKey('migration_id', migrationId);
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
    }
  },
});

module.exports = Migration;
