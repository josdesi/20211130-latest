/*
|--------------------------------------------------------------------------
| Migration Events
|--------------------------------------------------------------------------
|
*/

const Event = use('Event');
const EventTypes = use('App/Helpers/Events');

Event.on(EventTypes.Migration.Contacts.Completed, ['Migration.synchronizeAllUnSynchronizedHirings', 'Migration.synchronizeAllUnSynchronizedNames', 'Migration.startMigrationEmailValidation']);

Event.on(EventTypes.Migration.Companies.Completed, ['Migration.updateCompanyMissingSearchableTexts']);
