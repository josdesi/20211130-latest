'use strict';

/*
|--------------------------------------------------------------------------
| User Routes
|--------------------------------------------------------------------------
*/

const Route = use('Route');

Route.group(() => {
  Route.post('/template', 'ExampleController.sendgridGenericTemplateExample').middleware(['auth:jwt', 'statusActive']);; //Generic template example
  Route.post('/template-configuration', 'ExampleController.sendgridGenericTemplateViaConfigurationExample').middleware(['auth:jwt', 'statusActive']);; //Generic template example
  Route.post('/outlook-mailing', 'ExampleController.sendOutlookEmail').middleware(['auth:jwt', 'statusActive']);; //Generic template example
}).prefix('/api/v1/example');
