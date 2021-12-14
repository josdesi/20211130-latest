/*
|--------------------------------------------------------------------------
| User Events
|--------------------------------------------------------------------------
|
*/

const Event = use('Event');
const EventTypes = use('App/Helpers/Events');

Event.on(EventTypes.User.Created, ['User.refreshUsersView']);
Event.on(EventTypes.User.LogedIn, ['User.generateMicrosoftGraphSubscription']);
Event.on(EventTypes.User.GraphSubscriptionRenewed, ['User.refreshFailedGraphSubscriptionRenewal']);
Event.on(EventTypes.Dig.Updated, ['User.logChange','User.broadcast','User.notifyOnOfficeItemsReassign', 'Candidate.updateOrCreateDirectoryInformation']);
