'use strict';

/*
|--------------------------------------------------------------------------
| Permissions Routes
|--------------------------------------------------------------------------
*/

const Route = use('Route');

Route.group(() => {
  Route.get('/', 'PermissionController.index')
  .middleware(['auth:jwt','statusActive']);
}).prefix('/api/v1/permissions');
