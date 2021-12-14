'use strict';

/*
|--------------------------------------------------------------------------
| HiringAuthority Routes
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
  Route.get('/:id', 'HiringAuthorityController.find');
  Route.post('/:id/notes', 'HiringAuthorityController.storeNote');
  Route.put('/:hiringAuthorityId/notes/:id', 'HiringAuthorityController.updateNote');
  Route.delete('/:hiringAuthorityId/notes/:id', 'HiringAuthorityController.destroyNote');
  Route.post('/:id/files', 'HiringAuthorityController.storeFile');//
  Route.delete('/:id/files/:fileId', 'HiringAuthorityController.deleteFile');
  Route.post('/:id/activityLogs', 'HiringAuthorityController.storeActivityLog');
  Route.put('/:hiringAuthorityId/activityLogs/:id', 'HiringAuthorityController.updateActivityLog').validator('StoreActivityLog');
  Route.delete('/:hiringAuthorityId/activityLogs/:id', 'HiringAuthorityController.destroyActivityLog');
})
  .middleware('auth:jwt')
  .prefix('api/v1/hiring-authorities');

/*
  This route is invoked from Azure Functions backend in order to register external phone activity logs
*/ 
Route.group(() => {
  Route.post('/:id/external/activityLogs','HiringAuthorityController.storeExternalActivityLog')
    .validator('IdParam')
    .validator('StoreActivityLog');
})
  .middleware(['clientAppAuth'])
  .prefix('/api/v1/hiring-authorities');