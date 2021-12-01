'use strict';

/*
|--------------------------------------------------------------------------
| Websocket
|--------------------------------------------------------------------------
|
| This file is used to register websocket namespaces and boot the Ws server
|
| Each initNamespace method should start the needed middlewares, 
| event logic & whatever on event is deemed important at the start.
|
*/

const Helpers = use('Helpers');
const Server = use('Server');
const Ws = use('Socket.IO');
const bulkEmailNamespace = require('./sockets/bulkEmail');
const dashboardPhoneLoadingNamespace = require('./sockets/dashboardPhoneLoading');
const migrationNamespace = require('./sockets/migration');
const phoneActivityLogNamespace = require('./sockets/phoneActivityLog');
const userChangesgNamespace = require('./sockets/userChanges');

if (!Helpers.isAceCommand()) {
  Ws.boot(Server);

  bulkEmailNamespace.initNamespace(Ws);
  dashboardPhoneLoadingNamespace.initNamespace(Ws);
  migrationNamespace.initNamespace(Ws);
  phoneActivityLogNamespace.initNamespace(Ws);
  userChangesgNamespace.initNamespace(Ws, [
    'statusActive',
    'hasRole:Data Coordinator',
    'hasPermission:moduleContacts.usage',
  ]);
}
