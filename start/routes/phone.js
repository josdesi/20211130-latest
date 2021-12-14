'use strict';

/*
|--------------------------------------------------------------------------
| Phone Routes
|--------------------------------------------------------------------------
*/

const Route = use('Route');

Route.group(() => {

  Route.get('/calls-activity-in-time', 'PhoneController.totalCallsActivityInTime').validator('DashboardPhoneFilters');
  
  Route.get('/calls-inventory-list', 'PhoneController.totalCallsInventoryList').validator('DashboardPhoneFilters');

  Route.get('/calls-inventory-list-by-recruiter', 'PhoneController.callsInventoryListByRecruiter').validator('DashboardPhoneFilters');
  
  Route.get('/total-calls-inventory', 'PhoneController.totalCallsInventory').validator('DashboardPhoneFilters');

  Route.get('/sms-activity-in-time', 'PhoneController.totalSMSActivityInTime').validator('DashboardPhoneFilters');
  
  Route.get('/sms-inventory-list', 'PhoneController.totalSMSInventoryList').validator('DashboardPhoneFilters');
  
  Route.get('/total-sms-inventory', 'PhoneController.totalSMSInventory').validator('DashboardPhoneFilters');

  Route.get('/logs-last-update', 'PhoneController.phoneLastUpdate');

  Route.post('/track-phone-event', 'PhoneController.trackPhoneEvent').validator('TrackPhoneEvent');
})
.middleware(['auth:jwt','statusActive'])
.prefix('/api/v1/phone');

Route.group(() => {
  /*
    These routes are invoked from Azure Functions backend in order to notify FortPac backend that there are new
    records to show in the phone dashboard
  */ 
  Route.post('/new-records', 'PhoneController.newRecordsInserted');
  Route.post('/new-activity-logs', 'PhoneController.newActivityLogsInserted');

  /*
    These routes are invoked from easycron in order to perform a specific job when the established cron is executed
  */ 
  Route.get('/send-phone-metrics-coach', 'PhoneController.sendPhoneMetricsCoach');
  Route.get('/send-phone-metrics-regional', 'PhoneController.sendPhoneMetricsRegional');
})
  .middleware(['clientAppAuth'])
  .prefix('/api/v1/phone');

