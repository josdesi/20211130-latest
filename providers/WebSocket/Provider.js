'use strict';

const { ServiceProvider } = require('@adonisjs/fold');
const appInsights = require('applicationinsights');
const WebSocketService = require('./Service');

class WebSocketProvider extends ServiceProvider {
  /**
   * Register namespaces to the IoC container
   *
   * @method register
   *
   * @return {void}
   */
  register() {
    console.log('Registering Web Socket');

    this.app.singleton('Services/WebSocket', (app) => {
      return new WebSocketService(app.use('Adonis/Src/Config'));
    });

    this.app.alias('Services/WebSocket', 'Socket.IO');
  }

  /**
   * Attach context getter when all providers have
   * been registered
   *
   * @method boot
   *
   * @return {void}
   */
  boot() {
    try {
      /* This call is just to make sure the singleton instance is created at start time */
      const webSocket = this.app.use('Services/WebSocket');

      if (webSocket) {
        console.log('Websocket service initialized');
      }
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
    }
  }
}

module.exports = WebSocketProvider;
