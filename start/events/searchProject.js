/*
|--------------------------------------------------------------------------
| SearchProject Events
|--------------------------------------------------------------------------
|
*/

const Event = use('Event');
const EventTypes = use('App/Helpers/Events');

Event.on(EventTypes.SearchProject.Created, ['SearchProject.logChange']);
Event.on(EventTypes.SearchProject.Updated, ['SearchProject.logChange']);
Event.on(EventTypes.SearchProject.ItemDeleted, ['SearchProject.logChange']);
Event.on(EventTypes.SearchProject.ItemAdded, ['SearchProject.logChange']);
