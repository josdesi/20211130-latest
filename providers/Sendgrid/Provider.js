'use strict'

const { ServiceProvider } = require('@adonisjs/fold')
const appInsights = require('applicationinsights');
const SendgridService = require('./Service');

class SendgridProvider extends ServiceProvider {
  /**
   * Register namespaces to the IoC container
   *
   * @method register
   *
   * @return {void}
   */
  register () {
    console.log('Registering Sendgrid');

    this.app.singleton('Services/Sendgrid', () => {
      const Config = this.app.use("Adonis/Src/Config")
      return new SendgridService(Config);
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
  boot () {
    try {
      /* This call is just to make sure the singleton instance is created at start time */
      const sendgrid = this.app.use('Services/Sendgrid');    
        
      if (sendgrid) {
        console.log('Sendgrid service initialized');
      }
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
    }
  }
}

module.exports = SendgridProvider
