'use strict';

/** @type {typeof import('@adonisjs/framework/src/Route/Manager')} */
const Route = use('Route');

Route.group(() => {
  Route.get('/', 'ActivityLogTypeController.index');
})
  .middleware(['auth:jwt','statusActive'])
  .prefix('api/v1/activityLogTypes');
