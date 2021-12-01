'use strict';

/*
|--------------------------------------------------------------------------
| Migration Routes
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
  Route.get('/', 'CompanyMigrationController.listing');
  //Search Project
  Route.post('/search-projects', 'SearchProjectMigrationController.createMigration');
  Route.put('/search-projects/:id/config', 'SearchProjectMigrationController.updateConfig')
  Route.get('/search-projects/:id/progress', 'SearchProjectMigrationController.migrationProgress');


  //Company
  Route.post('/companies/:sourceId', 'CompanyMigrationController.uploadMigrationFile');
  Route.put('/companies/:id/specialties', 'CompanyMigrationController.updateIndustriesMapping').validator('UpdateMigrationSpecialties');
  Route.put('/companies/:id/columns', 'CompanyMigrationController.updateColumnsMap')
  Route.get('/companies/:id/progress', 'CompanyMigrationController.migrationProgress');

  //Contacts
  Route.post('/contacts/:sourceId', 'ContactsMigrationController.uploadMigrationFile');
  Route.post('/contacts/:sourceId/forCompany/:companyId', 'ContactsMigrationController.uploadMigrationFile');
  Route.put('/contacts/:id/specialties', 'ContactsMigrationController.updateIndustriesMapping').validator('UpdateMigrationSpecialties');
  Route.put('/contacts/:id/columns', 'ContactsMigrationController.updateColumnsMap')
  Route.put('/contacts/:id/positions', 'ContactsMigrationController.updatePosition');
  Route.get('/contacts/:id/progress', 'ContactsMigrationController.migrationProgress');
})
  .middleware(['auth:jwt', 'statusActive','hasRole:Data Coordinator','hasPermission:moduleContacts.usage'])
  .prefix('api/v1/migrations');
