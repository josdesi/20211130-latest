'use strict';

const { ServiceProvider } = require('@adonisjs/fold');
const NotificationService = require('./Service');

class NotificationProvider  extends ServiceProvider {
  /**
   * Register namespaces to the IoC container
   *
   * @method register
   *
   * @return {void}
   */
  register() {
    console.log('Registering Notification');

    this.app.singleton('Services/Notification', () => {
      const Config = this.app.use('Adonis/Src/Config');
      return new NotificationService(Config);
    });
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
      const notification = this.app.use('Services/Notification');      
      if (notification) {
        console.log('Notification service initialized');
      }
    } catch (error) {
      console.log(error);
    }
  }
}

module.exports = NotificationProvider;
