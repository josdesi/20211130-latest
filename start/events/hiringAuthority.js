const Event = use('Event');
const EventTypes = use('App/Helpers/Events');

Event.on(EventTypes.HiringAuthority.Created, ['HiringAuthority.updateOrCreateDirectoryInformation', 'EmailValidation.validate']);
Event.on(EventTypes.HiringAuthority.Updated, ['HiringAuthority.updateOrCreateDirectoryInformation']);
Event.on(EventTypes.HiringAuthority.Deleted, ['HiringAuthority.deleteDirectoryInformation']);

Event.on(EventTypes.HiringAuthority.ActivityCreated, ['HiringAuthority.updateActivityTableThenDirectory']);
Event.on(EventTypes.HiringAuthority.ActivityUpdated, ['HiringAuthority.updateActivityTableThenDirectory']);
Event.on(EventTypes.HiringAuthority.ActivityDeleted, ['HiringAuthority.updateActivityTableThenDirectory']);
Event.on(EventTypes.HiringAuthority.BatchActivityCreated, ['HiringAuthority.updateBatchActivityTableThenDirectory']);
