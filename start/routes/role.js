'use strict';

/*
|--------------------------------------------------------------------------
| Roles Routes
|--------------------------------------------------------------------------
*/

const Route = use('Route');

Route.group(() => {
  Route.get('/', 'RoleController.indexByFilter')
  .middleware(['auth:jwt','statusActive']);

}).prefix('/api/v1/roles');
