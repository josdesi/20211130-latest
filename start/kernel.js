'use strict'

/** @type {import('@adonisjs/framework/src/Server')} */
const Server = use('Server')
const Config = use('Adonis/Src/Config');
const { globalMiddleware, namedMiddleware, serverMiddleware } = Config.get('middleware');

Server
  .registerGlobal(globalMiddleware)
  .registerNamed(namedMiddleware)
  .use(serverMiddleware)
