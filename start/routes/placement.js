'use strict';

/*
|--------------------------------------------------------------------------
| Placement Routes
|--------------------------------------------------------------------------
*/

const Route = use('Route');

Route.group(() => {
  Route.get('/for-processing', 'PlacementController.getAvailableToProcessEstimation');
})
.middleware(['clientAppAuth'])
.prefix('/api/v1/placements');

Route.group(() => {
  Route.post('/', 'PlacementController.store').validator('StorePlacement');
  Route.post('/:id/suggest-update', 'PlacementController.suggestAnUpdate').validator('StoreSuggestionUpdate');

  Route.get('/', 'PlacementController.index');
  Route.get('/statuses', 'PlacementController.getStatuses');
  Route.get('/summary','PlacementController.summary');
  Route.get('/fallOffReasons', 'PlacementController.getFallOffReasons');
  Route.get('/:id', 'PlacementController.show').validator('GetPlacement');
  
  //FallOff
  Route.put('/:id/requestFallOff', 'PlacementController.requestFallOff').middleware(['hasRole:Regional Director']);
  Route.put('/:id/markfallOff', 'PlacementController.markAsFallOff').middleware(['hasRole:Finance']);
  Route.put('/:id/requestRevertFallOff', 'PlacementController.requestRevertFallOff').middleware(['hasRole:Regional Director']);
  Route.put('/:id/revertFallOff', 'PlacementController.revertFallOff').middleware(['hasRole:Finance']);
  Route.put('/:id', 'PlacementController.update').validator('UpdatePlacement');

  //Logs
  Route.get('/:id/logs', 'PlacementController.getChangeLogs');

  //Invoice
  Route.post('/:id/invoices', 'PlacementController.storeInvoice').validator('StorePlacementInvoice').middleware(['hasRole:Finance']);
  Route.get('/:id/invoices', 'PlacementController.invoices');
  Route.patch('/:placementId/invoices/:id', 'PlacementController.updateInvoice').validator('StorePlacementInvoice').middleware(['hasRole:Finance']);
  Route.delete('/:placementId/invoices/:id', 'PlacementController.deleteInvoice').middleware(['hasRole:Finance']);

  //Payment
  Route.post('/:id/payments', 'PlacementController.storePayment').validator('StorePlacementPayment').middleware(['hasRole:Finance']);
  Route.get('/:id/payments', 'PlacementController.payments');
  Route.patch('/:placementId/payments/:id', 'PlacementController.updatePayment').validator('StorePlacementPayment').middleware(['hasRole:Finance']);
  Route.delete('/:placementId/payments/:id', 'PlacementController.deletePayment').middleware(['hasRole:Finance']);
})
.middleware(['auth:jwt','statusActive','hasPermission:placements.usage'])
.prefix('/api/v1/placements');



