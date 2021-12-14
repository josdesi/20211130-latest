'use strict';

/*
|--------------------------------------------------------------------------
| User Routes
|--------------------------------------------------------------------------
*/

const Route = use('Route');

Route.post('/microsoft-graph-webhook', 'UserController.microsoftGraphWebhook').prefix('/api/v1');
Route.get('/renew-microsoft-graph-subscriptions', 'UserController.renewMicrosoftGraphSubscriptions').prefix('/api/v1');

Route.group(() => {
  Route.post('', 'UserController.signin').validator('StoreUser');

  Route.post('/token/refresh', 'UserController.refreshToken').middleware('ValidateJWTSign');

  Route.get('/logout', 'UserController.logout').middleware(['auth:jwt', 'statusActive']);

  Route.get('', 'UserController.index').middleware(['auth:jwt', 'statusActive']);

  Route.get('/roster', 'UserController.roster').middleware(['auth:jwt', 'statusActive']);
  Route.get('/roster/offices', 'UserController.offices').middleware(['auth:jwt', 'statusActive']);

  Route.get('/managers', 'UserController.managers').middleware(['auth:jwt', 'statusActive']);
  
  Route.post('/generate/code', 'UserController.generateVerificationCode').validator('GenerateVerificationCode');
  Route.post('/resend/code', 'UserController.resendVerificationCode').validator('GenerateVerificationCode');
  Route.post('/verify/code', 'UserController.verifyVerificationCode').validator('VerifyVerificationCode');

  Route.get('/:id/basicInfo', 'UserController.basicInfo').middleware(['auth:jwt', 'statusActive']);

  Route.get('/:id/channel-partner', 'ChannelPartnerController.index').middleware(['auth:jwt', 'statusActive']);
  
  Route.get('/timezones', 'UserController.listingTimezones').middleware(['auth:jwt','statusActive']);
}).prefix('/api/v1/users');

Route.get('/api/v1/statuses', 'UserController.statuses').middleware(['auth:jwt','statusActive']);
