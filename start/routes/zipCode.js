'use strict';

/** @type {typeof import('@adonisjs/framework/src/Route/Manager')} */
const Route = use('Route');

Route.group(() => {
  Route.get('/', 'ZipCodeController.searchZipCodes');
})
  .middleware(['auth:jwt','statusActive'])
  .prefix('api/v1/zip-codes');