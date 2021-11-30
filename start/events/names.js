const Event = use('Event');
const EventTypes = use('App/Helpers/Events');

Event.on(EventTypes.Name.Created, ['Name.updateOrCreateDirectoryInformation', 'EmailValidation.validate', 'Name.updateSearchableText']);
Event.on(EventTypes.Name.Updated, ['Name.updateOrCreateDirectoryInformation', 'Name.updateSearchableText']);
Event.on(EventTypes.Name.Converted, ['Name.deleteDirectoryInformation']);
Event.on(EventTypes.Name.Deleted, ['Name.deleteDirectoryInformation']);

Event.on(EventTypes.Name.ActivityCreated, ['Name.updateActivityTableThenDirectory']);
Event.on(EventTypes.Name.ActivityUpdated, ['Name.updateActivityTableThenDirectory']);
Event.on(EventTypes.Name.ActivityDeleted, ['Name.updateActivityTableThenDirectory']);
Event.on(EventTypes.Name.BatchActivityCreated, ['Name.updateBatchActivityTableThenDirectory']);
