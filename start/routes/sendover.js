'use strict';

/** @type {typeof import('@adonisjs/framework/src/Route/Manager')} */
const Route = use('Route');

Route.group(() => {
  Route.post('/', 'SendoutController.store').validator('StoreSendover');
  Route.put('/convert/sendout/:id', 'SendoutController.convertSendoverToSendout').validator('IdParam').validator('StoreSendout');
})
  .middleware(['auth:jwt','statusActive'])
  .prefix('api/v1/sendovers');
