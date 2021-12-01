'use strict';

/** @type {import('@adonisjs/framework/src/Env')} */

module.exports = {
  /*
  |--------------------------------------------------------------------------
  | Global Middleware
  |--------------------------------------------------------------------------
  |
  | Global middleware are executed on each http request only when the routes
  | match.
  |
  */
  globalMiddleware : [
    'Adonis/Middleware/BodyParser',
    'App/Middleware/ConvertEmptyStringsToNull',
  ],

  /*
  |--------------------------------------------------------------------------
  | Named Middleware
  |--------------------------------------------------------------------------
  |
  | Named middleware is key/value object to conditionally add middleware on
  | specific routes or group of routes.
  |
  | // define
  | {
  |   auth: 'Adonis/Middleware/Auth'
  | }
  |
  | // use
  | Route.get().middleware('auth')
  |
  */
  namedMiddleware : {
    auth: 'Adonis/Middleware/Auth',
    guest: 'Adonis/Middleware/AllowGuestOnly',
    ValidateJWTSign: 'App/Middleware/ValidateJWTSign',
    statusActive: 'App/Middleware/UserActive',
    hasRole: 'App/Middleware/HasRole',
    feeAgreementTestGuard: 'App/Middleware/FeeAgreementTestGuard',
    hasPermission: 'App/Middleware/HasPermission',
    remoteTaskAuth: 'App/Middleware/RemoteTaskAuth',
    UserHasCandidateModifyAuthorization: 'App/Middleware/UserHasCandidateModifyAuthorization',
    clientAppAuth: 'App/Middleware/ClientAppAuthentication',
  },

  /*
  |--------------------------------------------------------------------------
  | Server Middleware
  |--------------------------------------------------------------------------
  |
  | Server level middleware are executed even when route for a given URL is
  | not registered. Features like `static assets` and `cors` needs better
  | control over request lifecycle.
  |
  */
  serverMiddleware : [
    // 'Adonis/Middleware/Static',
    'Adonis/Middleware/Cors'
  ]
};
