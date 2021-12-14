'use strict';

const { initJwtNamespace } = require('./initializations/jwtAuthInit');
const { WebSocketNamespaces } = use('App/Helpers/Globals');

/**
 * The initializer method
 *
 * @summary This method includes the logic to initialize the namespace, the middleware & whatever is deemed needed in the namespace init
 *
 * @param {Object} Ws - The Socket.IO service already booted
 */
const initNamespace = (Ws) => initJwtNamespace(Ws, WebSocketNamespaces.Migration);

module.exports = {
  initNamespace,
};
