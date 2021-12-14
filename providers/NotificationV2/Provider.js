'use strict';

const { ServiceProvider } = require('@adonisjs/fold');
const NotificationServiceV2 = require('./Service');

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

    this.app.singleton('Services/NotificationV2', () => {
      const Config = this.app.use('Adonis/Src/Config');
      return new NotificationServiceV2(Config);
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
      const notification = this.app.use('Services/NotificationV2');      
      if (notification) {
        console.log('Notification service initialized');
      }
    } catch (error) {
      console.log(error);
      appInsights.defaultClient.trackException({exception: error});
    }
  }
}

module.exports = NotificationProvider;
