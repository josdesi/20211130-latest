/*
|--------------------------------------------------------------------------
| Sendout Reminder Events
|--------------------------------------------------------------------------
|
*/

const Event = use('Event');
const EventTypes = use('App/Helpers/Events');

const activityLogEvents = [
  "Sendout.CreateActivityLogForCompany",
  "Sendout.CreateActivityLogForJobOrder",
  "Sendout.CreateActivityLogForCandidate",
];

Event.on(EventTypes.Sendout.Created, [
  ...activityLogEvents,
  'Sendout.SendGlipMessage'
]);
Event.on(EventTypes.Sendout.Updated, [
  ...activityLogEvents,
]);
Event.on(EventTypes.Sendout.Converted, [
  ...activityLogEvents,
  'Sendout.SendGlipMessage'
]);
Event.on(EventTypes.Sendout.Deleted, [
  ...activityLogEvents,
]);
Event.on(EventTypes.Sendout.CreateReminder, ['Sendout.RemindersCreated']);
Event.on(EventTypes.Sendout.DeleteReminder, ['Sendout.RemindersDeleted']);
Event.on(EventTypes.Sendout.DeleteReminderById, ['Sendout.ReminderDeletedById']);
Event.on(EventTypes.Sendout.UpdatedStatus, ['Sendout.LogEventUpdate']);
