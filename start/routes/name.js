'use strict';

/*
|--------------------------------------------------------------------------
| Name Routes
|--------------------------------------------------------------------------
|
| Http routes are entry points to your web application. You can create
| routes for different URLs and bind Controller actions to them.
|
| A complete guide on routing is available here.
| http://adonisjs.com/docs/4.1/routing
|
*/

/** @type {typeof import('@adonisjs/framework/src/Route/Manager')} */
const Route = use('Route');

Route.group(() => {
  Route.get('/types', 'NameController.types');

  //Suggest Company
  Route.get('/:id/suggested-companies', 'NameController.indexSuggestedCompanies').validator('GetSuggestedNameCompanies');

  Route.get('/statuses', 'NameController.statuses');
  Route.get('/grouped-types', 'NameController.groupedTypesByRole');
  Route.get('/grouped-statuses', 'NameController.groupedStatusByRole');
  Route.get('/getAavailableNames', 'NameController.getAavailableNames');
  Route.get('/statuses/byNameType/:id', 'NameController.statusesByNameType');

  Route.post('', 'NameController.store').validator('StoreName');

  Route.get('/:id', 'NameController.show').validator('IdParam');

  Route.get('/', 'NameController.index');



  Route.put('/:id', 'NameController.update').validator('UpdateName');


  Route.post('/:id/activityLogs', 'NameController.storeActivityLog')
    .validator('IdParam')
    .validator('StoreActivityLog')

  //EmployerCompany
  Route.post('/:id/employer-company', 'NameController.storeEmployerCompany').validator('StoreNameEmployerCompany');


  Route.put('/:nameId/activityLogs/:id', 'NameController.updateActivityLog')
    .validator('StoreActivityLog')

  Route.delete('/:nameId/activityLogs/:id', 'NameController.destroyActivityLog')

  Route.post('/:id/notes', 'NameController.storeNote')
    .validator('IdParam')
    .validator('StoreNote')

  Route.put('/:nameId/notes/:id', 'NameController.updateNote')
    .validator('StoreNote');

  Route.delete('/:nameId/notes/:id', 'NameController.destroyNote');

  Route.post('/:id/files', 'NameController.storeFile');

  Route.delete('/:id/files/:fileId', 'NameController.deleteFile');

})
  .middleware(['auth:jwt', 'statusActive'])
  .prefix('api/v1/names');

/*
  This route is invoked from Azure Functions backend in order to register external phone activity logs
*/ 
Route.group(() => {
  Route.post('/:id/external/activityLogs','NameController.storeExternalActivityLog')
    .validator('IdParam')
    .validator('StoreActivityLog');
})
  .middleware(['clientAppAuth'])
  .prefix('/api/v1/names');




