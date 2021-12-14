'use strict';

const { ServiceProvider } = require('@adonisjs/fold');
const NotificationServiceV1 = require('./Service');
const NotificationServiceV2 = require('../NotificationV2/Service');

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
      const notificationVersionToUse = Config.get('notification.versionToUse');
      if (notificationVersionToUse == '1') {
        console.log('Using notifications service version 1');
        return new NotificationServiceV1(Config);
      } else if (notificationVersionToUse == '2') {
        console.log('Using notifications service version 2');
        return new NotificationServiceV2(Config);
      }
      
      throw new Error('Notification service version was not specified correctly');
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
