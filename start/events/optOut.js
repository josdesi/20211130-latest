/*
|--------------------------------------------------------------------------
| OptOut Events
|--------------------------------------------------------------------------
|
*/

const Event = use('Event');
const EventTypes = use('App/Helpers/Events');

Event.on(EventTypes.BulkEmail.OptOutCreated, ['OptOut.logChange']);
Event.on(EventTypes.BulkEmail.OptOutDeleted, ['OptOut.logChange']);
