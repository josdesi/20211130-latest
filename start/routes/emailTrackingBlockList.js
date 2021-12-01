'use strict';

/*
|--------------------------------------------------------------------------
| Email Tracking Block List Routes
|--------------------------------------------------------------------------
*/

const Route = use('Route');

Route.group(() => {
  Route.resource('', 'EmailTrackingBlockListController')
    .middleware(['auth:jwt', 'statusActive'])
    .validator(
      new Map([
        [['.index'], ['PaginateParam']],
        [['.store'], ['StoreEmailTrackingBlock']],
        [['.destroy'], ['DeleteEmailTrackingBlock']],
      ])
    );
}).prefix('/api/v1/email-tracking-block');
