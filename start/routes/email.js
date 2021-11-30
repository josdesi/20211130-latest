'use strict';

/*
|--------------------------------------------------------------------------
| Email Routes
|--------------------------------------------------------------------------
*/

const Route = use('Route');

Route.group(() => {
  Route.post('/validate', 'EmailController.storeEmailValidation').validator('StoreEmailValidation');
})
  .middleware('auth:jwt')
  .prefix('/api/v1/email');
