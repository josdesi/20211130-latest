'use strict'

/** @type {typeof import('@adonisjs/framework/src/Route/Manager')} */

const Route = use('Route')

Route
  .group(() => {
    Route.post('/add-registration-token', 'NotificationController.addRegistrationToken');
    Route.post('/mark-notification-as-read', 'NotificationController.markNotificationAsRead');
    Route.get('/get-notification-history', 'NotificationController.getNotificationHistory').validator('GetNotificationHistory');
  })
  .middleware(['auth:jwt','statusActive'])
  .prefix('api/v1/notifications');


  Route.group(() => {
    Route.post('/daily-summary','NotificationController.sendDailySummary');
  })
    .middleware(['clientAppAuth'])
    .prefix('api/v1/notifications');