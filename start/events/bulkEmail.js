/*
|--------------------------------------------------------------------------
| Bulk Emails Events
|--------------------------------------------------------------------------
|
*/

const Event = use('Event');
const EventTypes = use('App/Helpers/Events');

Event.on(EventTypes.BulkEmail.ScheduleCreated, ['BulkEmail.schedule']);
Event.on(EventTypes.BulkEmail.ScheduleDeleted, ['BulkEmail.delete']);
Event.on(EventTypes.BulkEmail.ScheduleUpdated, ['BulkEmail.update']);
Event.on(EventTypes.BulkEmail.Sent, ['BulkEmail.notifyUserBulkSent']);
