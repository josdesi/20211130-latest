/*
|--------------------------------------------------------------------------
| Job order Events
|--------------------------------------------------------------------------
|
*/

const Event = use('Event');
const EventTypes = use('App/Helpers/Events');

Event.on(EventTypes.JobOrder.Created, ['JobOrder.notifyOnCreation','JobOrder.notifyOnRecruiterAssigned']);

Event.on(EventTypes.JobOrder.Updated, ['JobOrder.logChange']);

Event.on(EventTypes.JobOrder.WhiteSheetUpdated, ['JobOrder.notifyOnStatusUpdate','JobOrder.logWhiteSheetUpdate','JobOrder.evaluateFreeGame']);

Event.on(EventTypes.JobOrder.CandidateMatched, ['JobOrder.notifyMatchWithCandidate']);

Event.on(EventTypes.JobOrder.NoteUpdated, ['JobOrder.logChange']);
Event.on(EventTypes.JobOrder.NoteDeleted, ['JobOrder.logChange']);

Event.on(EventTypes.JobOrder.ActivityUpdated, ['JobOrder.logChange']);
Event.on(EventTypes.JobOrder.ActivityDeleted, ['JobOrder.logChange']);

Event.on(EventTypes.JobOrder.FileDeleted, ['JobOrder.logChange']);

Event.on(EventTypes.JobOrder.AdditionalRecruiterRequested, ['JobOrder.notifyOnRecruiterRequest', 'JobOrder.logAssignment']);
Event.on(EventTypes.JobOrder.AdditionalRecruiterRemoved, ['JobOrder.logAssignment','JobOrder.notifyOnAdditionalRecruiterRemoved']);
Event.on(EventTypes.JobOrder.AdditionalRecruiterUpdated, ['JobOrder.logAssignment','JobOrder.notifyOnRecruiterRequest']);

Event.on(EventTypes.JobOrder.RecruiterReassigned, ['JobOrder.notifyOnRecruiterAssigned']);
