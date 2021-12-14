'use strict';

/*
|--------------------------------------------------------------------------
| Ace Routes
|--------------------------------------------------------------------------
*/

const Route = use('Route');

Route.group(() => {
  Route.get('mig-status', 'AceController.migrationsStatus');
  Route.get('mig-run', 'AceController.migrationsRun');
  Route.get('mig-post-setup', 'AceController.postDbSetup');
}).prefix('/api/v1/ace').middleware('remoteTaskAuth');
