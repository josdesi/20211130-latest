/*
|--------------------------------------------------------------------------
| Email Tracking Block List Events
|--------------------------------------------------------------------------
|
*/

const Event = use('Event');
const EventTypes = use('App/Helpers/Events');

Event.on(EventTypes.EmailTrackingBlock.Created, ['EmailTrackingBlockList.logChange']);
Event.on(EventTypes.EmailTrackingBlock.Deleted, ['EmailTrackingBlockList.logChange']);
