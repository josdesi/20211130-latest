'use strict';

/*
|--------------------------------------------------------------------------
| File Routes
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
  Route.post('', 'FileController.upload');
  Route.get('/get-file', 'FileController.getFile');
  Route.get('/attributes', 'FileController.getFileAttributes');
  Route.get('/types', 'FileController.getFileTypes');
  Route.delete('/:id', 'FileController.destroy').validator('IdParam');
})
  .middleware(['auth:jwt','statusActive'])
  .prefix('api/v1/files');
