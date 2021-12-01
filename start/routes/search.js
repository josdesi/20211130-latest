'use strict';

/** @type {typeof import('@adonisjs/framework/src/Route/Manager')} */
const Route = use('Route');

Route.group(() => {
  Route.get('/', 'SearchController.index');
})
  .middleware(['auth:jwt','statusActive'])
  .prefix('api/v1/search');
