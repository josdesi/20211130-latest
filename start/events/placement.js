/*
|--------------------------------------------------------------------------
| Placement Events
|--------------------------------------------------------------------------
|
*/

const Event = use('Event');
const EventTypes = use('App/Helpers/Events');

Event.on(EventTypes.Placement.Created, [
  'Placement.sendNotification',
  'Placement.sendEmail',
  'Placement.changeInventoryToPlacedOnApproved',
  'Placement.changeSendoutToPlacedOnApproved',
  'Placement.logChange',
  'Placement.addActivityOnRelatedItems',
  'Placement.updateFeeAmountSendout',
  'Placement.updateCompanyToClientIfApproved',
  'Placement.postDealMessageIfApproved'
]);
Event.on(EventTypes.Placement.SuggestionUpdate, [
  'Placement.sendNotification',
  'Placement.sendEmail',
  'Placement.logChange'
]);
Event.on(EventTypes.Placement.Updated, [
  'Placement.sendNotification',
  'Placement.sendEmail',
  'Placement.addEmployeeIfApprove',
  'Placement.changeInventoryToPlacedOnApproved',
  'Placement.changeSendoutToPlacedOnApproved',
  'Placement.logChange',
  'Placement.addActivityOnRelatedItems',
  'Placement.updateFeeAmountSendout',
  'Placement.updateCompanyToClientIfApproved',
  'Placement.postDealMessageIfApproved'
]);
Event.on(EventTypes.Placement.RequestFallOff, ['Placement.logChange', 'Placement.sendEmail']);
Event.on(EventTypes.Placement.FallenOff, ['Placement.logChange', 'Placement.sendEmail']);
Event.on(EventTypes.Placement.RequestRevertFallOff, ['Placement.logChange', 'Placement.sendEmail']);
Event.on(EventTypes.Placement.RevertFallOff, ['Placement.logChange', 'Placement.sendEmail']);

Event.on(EventTypes.Placement.InvoiceCreated, ['Placement.logChange', 'Placement.sendEmail']);
Event.on(EventTypes.Placement.InvoiceUpdated, ['Placement.logChange']);
Event.on(EventTypes.Placement.InvoiceDeleted, ['Placement.logChange']);

Event.on(EventTypes.Placement.PaymentCreated, ['Placement.logChange', 'Placement.sendEmail']);
Event.on(EventTypes.Placement.PaymentUpdated, ['Placement.logChange']);
Event.on(EventTypes.Placement.PaymentDeleted, ['Placement.logChange']);