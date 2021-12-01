'use strict';

// Utils
const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/postgres-adapter');
const appInsights = require('applicationinsights');
const { Pool } = require('pg');
const Helpers = use('Helpers');

class WebSocketService {
  constructor(Config) {
    try {
      this.corsConfig = Config.get('cors');
      this.dbConnection = Config.get('database.pg_sockets');
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
    }
  }

  boot(server) {
    const Env = use('Env');

    try {
      /**
       * Ignore multiple calls to the boot method
       */
      if (this.booted) {
        return;
      }

      this.booted = true;
      if (Helpers.isAceCommand()) return null;
      this.io = new Server(server.getInstance(), {
        cors: this.corsConfig,
        transports: ['websocket'],
      });

      const pool = new Pool(this.dbConnection);

      if (Env.get('NODE_ENV') !== 'development') {
        this.io.adapter(createAdapter(pool));
      }
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
    }
  }
}

module.exports = WebSocketService;
