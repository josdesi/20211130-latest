'use strict';

/*
|--------------------------------------------------------------------------
| DashBoard Routes
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

  Route.get('/activityNoteInTime', 'DashboardController.totalActivityNoteInTime').validator('DashboardFilters');
  
  Route.get('/totalInventory', 'DashboardController.totalInventory').validator('DashboardFilters');
  
  Route.get('/totalTypesOrStatus', 'DashboardController.candidateOrJobOrderTypesOrStatus').validator('DashboardFilters');

  Route.get('/activityList', 'DashboardController.totalListActivityCompany').validator('DashboardFilters');

  Route.get('/activityListTypeOrStatus', 'DashboardController.candidateOrJobOrderListTypesOrStatus').validator('DashboardFilters');

  Route.get('/inventoryList', 'DashboardController.totalListInventory').validator('DashboardFilters');
})
  .middleware(['auth:jwt','statusActive'])
  .prefix('api/v1/dashboard');



  

