/*
|--------------------------------------------------------------------------
| Candidate Events
|--------------------------------------------------------------------------
|
*/

const Event = use('Event');
const EventTypes = use('App/Helpers/Events');

Event.on(EventTypes.Candidate.Created, ['Candidate.notifyOnCreation','Candidate.notifyOnRecruiterAssigned', 'Candidate.updateOrCreateDirectoryInformation', 'EmailValidation.validate']);

Event.on(EventTypes.Candidate.Updated, ['Candidate.logChange', 'Candidate.updateOrCreateDirectoryInformation']);

Event.on(EventTypes.Candidate.BlueSheetUpdated, ['Candidate.notifyOnStatusUpdate', 'Candidate.logBluesheetUpdate','Candidate.evaluateFreeGame', 'Candidate.updateOrCreateDirectoryInformation']);

Event.on(EventTypes.Candidate.JobOrderMatched, ['Candidate.notifyMatchWithJobOrder', 'Candidate.updateOrCreateDirectoryInformation']);

Event.on(EventTypes.Candidate.NoteUpdated, ['Candidate.logChange', 'Candidate.updateOrCreateDirectoryInformation']);
Event.on(EventTypes.Candidate.NoteDeleted, ['Candidate.logChange']);

Event.on(EventTypes.Candidate.ActivityCreated, ['Candidate.updateActivityTableThenDirectory']);
Event.on(EventTypes.Candidate.ActivityUpdated, ['Candidate.logChange', 'Candidate.updateActivityTableThenDirectory']);
Event.on(EventTypes.Candidate.ActivityDeleted, ['Candidate.logChange', 'Candidate.updateActivityTableThenDirectory']);
Event.on(EventTypes.Candidate.BatchActivityCreated, ['Candidate.updateBatchActivityTableThenDirectory']);

Event.on(EventTypes.Candidate.FileDeleted, ['Candidate.logChange', 'Candidate.updateOrCreateDirectoryInformation']);

Event.on(EventTypes.Candidate.AdditionalRecruiterRequested, ['Candidate.notifyOnRecruiterRequest', 'Candidate.logAssignment', 'Candidate.updateOrCreateDirectoryInformation']);
Event.on(EventTypes.Candidate.AdditionalRecruiterRemoved, ['Candidate.logAssignment','Candidate.notifyOnAdditionalRecruiterRemoved', 'Candidate.updateOrCreateDirectoryInformation']);
Event.on(EventTypes.Candidate.AdditionalRecruiterUpdated, ['Candidate.logAssignment','Candidate.notifyOnRecruiterRequest', 'Candidate.updateOrCreateDirectoryInformation']);

Event.on(EventTypes.Candidate.RecruiterReassigned, ['Candidate.notifyOnRecruiterAssigned', 'Candidate.updateOrCreateDirectoryInformation']);

Event.on(EventTypes.Candidate.ReferenceReleaseCreated, ['Candidate.logChange','Candidate.updateReferenceSentDate', 'Candidate.addReferenceReleaseActivity']);