/*
|--------------------------------------------------------------------------
| Company Events
|--------------------------------------------------------------------------
|
*/

const Event = use('Event');
const EventTypes = use('App/Helpers/Events');

Event.on(EventTypes.Company.Created, ['Company.notifyOnCreation', 'Company.logChange', 'Company.updateHiringAuthoritiesDirectoryInformation', 'Company.updateCandidatesDirectoryInformation', 'Company.updateNamesDirectoryInformation', 'Company.updateSearchableText', 'EmailValidation.validate']);
Event.on(EventTypes.Company.FeeAgreementSigned, ['Company.onFeeAgreementSigned']);
Event.on(EventTypes.Company.Reassured, ['Company.notifyReassured', 'Company.logChange', 'Company.updateHiringAuthoritiesDirectoryInformation', 'Company.updateCandidatesDirectoryInformation', 'Company.updateNamesDirectoryInformation']);
Event.on(EventTypes.Company.PendingReassureUpdated, ['Company.notifyPendingReassureUpdated', 'Company.logChange']);
Event.on(EventTypes.Company.ReassureVerified, ['Company.notifyReassureVerified', 'Company.logChange', 'Company.updateHiringAuthoritiesDirectoryInformation', 'Company.updateCandidatesDirectoryInformation', 'Company.updateNamesDirectoryInformation']);

Event.on(EventTypes.Company.Updated, ['Company.logChange', 'Company.updateHiringAuthoritiesDirectoryInformation', 'Company.updateCandidatesDirectoryInformation', 'Company.updateNamesDirectoryInformation', 'Company.updateSearchableText',]);
Event.on(EventTypes.Company.NoteCreated, ['Company.logChange']);
Event.on(EventTypes.Company.NoteUpdated, ['Company.logChange']);
Event.on(EventTypes.Company.NoteDeleted, ['Company.logChange']);
Event.on(EventTypes.Company.ActivityCreated, ['Company.logChange']);
Event.on(EventTypes.Company.ActivityUpdated, ['Company.logChange']);
Event.on(EventTypes.Company.ActivityDeleted, ['Company.logChange']);
Event.on(EventTypes.Company.FileCreated, ['Company.logChange']);
Event.on(EventTypes.Company.FileDeleted, ['Company.logChange']);
