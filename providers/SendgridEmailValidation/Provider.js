'use strict'

const { ServiceProvider } = require('@adonisjs/fold')
const appInsights = require('applicationinsights');
const SendgridEmailValidationService = require('./Service');

class SendgridEmailValidationProvider extends ServiceProvider {
  /**
   * Register namespaces to the IoC container
   *
   * @method register
   *
   * @return {void}
   */
  register () {
    console.log('Registering Sendgrid Email Validation');

    this.app.singleton('Services/SendgridEmailValidation', () => {
      const Config = this.app.use("Adonis/Src/Config")
      return new SendgridEmailValidationService(Config);
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
      const sendgrid = this.app.use('Services/SendgridEmailValidation');    
        
      if (sendgrid) {
        console.log('Sendgrid Email Validation service initialized');
      }
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
    }
  }
}

module.exports = SendgridEmailValidationProvider
