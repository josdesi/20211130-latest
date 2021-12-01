/*
|--------------------------------------------------------------------------
| MicrosoftGraph Events
|--------------------------------------------------------------------------
|
*/

const Event = use('Event');
const EventTypes = use('App/Helpers/Events');

Event.on(EventTypes.MicrosoftGraph.MailObtained, ['MicrosoftGraph.storeMail']);
Event.on(EventTypes.MicrosoftGraph.EmailSent, ['MicrosoftGraph.logChange']);
