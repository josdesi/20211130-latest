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
  Route.get('/total-bulk-sent', 'BulkEmailDashboardController.totalBulkSent').validator('DashboardFilters');
  Route.get('/trend-bulk-sent', 'BulkEmailDashboardController.trendBulkSent').validator('DashboardFilters');
  Route.get('/total-bulk-stats', 'BulkEmailDashboardController.totalBulkStats').validator('DashboardFilters');
  Route.get('/table-bulk-sent', 'BulkEmailDashboardController.tableBulkSent')
    .validator('DashboardFilters')
    .validator('BulkDashboardFilters');
})
  .middleware(['auth:jwt', 'statusActive'])
  .prefix('api/v1/bulk-email-dashboard');
