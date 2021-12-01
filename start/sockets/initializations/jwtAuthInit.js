'use strict';

const SocketIoMiddleware = require('../middleware');

/**
 * Genereic initializer method with jwt Auth
 *
 * @summary This method includes the logic to initialize the namespace & the jwt auth middleware
 *
 * @param {Object} Ws - The Socket.IO service already booted
 * @param {String} namespace - The namespace being initialized
 */
const initJwtNamespace = (Ws, namespace, middlewares = []) => {
  //Set up namespace
  const socketNamespace = Ws.io.of(namespace);

  //Midllewares
  const sockMiddleware = new SocketIoMiddleware();
  sockMiddleware.apply(socketNamespace, middlewares);
};

module.exports = {
  initJwtNamespace,
};
