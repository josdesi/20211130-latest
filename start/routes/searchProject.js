'use strict';

/*
|--------------------------------------------------------------------------
| Search Project Routes
|--------------------------------------------------------------------------
*/

const Route = use('Route');

Route.group(() => {
  Route.get('/types', 'SearchProjectController.indexTypes');

  Route.put('/:id/preview', 'SearchProjectController.preview').validator('GetSPPreview');

  Route.put('/:id/inventory', 'SearchProjectController.updateInventory').validator('UpdateSearchProjectInventory');
  Route.delete('/:id/inventory', 'SearchProjectController.destroyInventory').validator('DeleteSearchProjectInventory');
  Route.get('/:id/inventory', 'SearchProjectController.showInventory');

  Route.get('/:id/quick-info', 'SearchProjectController.showQuickInfo');

  Route.get('/', 'SearchProjectController.index').validator('GetSearchProjects');
  Route.get('/byUser/:id', 'SearchProjectController.indexUser');
  Route.post('/', 'SearchProjectController.store').validator('StoreSearchProject');
  Route.put('/:id', 'SearchProjectController.update').validator('UpdateSearchProject');
  Route.delete('/:id', 'SearchProjectController.destroy');
})
  .middleware(['auth:jwt', 'statusActive'])
  .prefix('/api/v1/search-projects');
