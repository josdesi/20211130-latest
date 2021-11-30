'use strict';

const { ServiceProvider } = require('@adonisjs/fold');
const appInsights = require('applicationinsights');
const BriteVerifyEmailValidationService = require('./Service');

class BriteVerifyEmailValidationProvider extends ServiceProvider {
  /**
   * Register namespaces to the IoC container
   *
   * @method register
   *
   * @return {void}
   */
  register() {
    console.log('Registering BriteVerify Email Validation');

    this.app.singleton('Services/BriteVerifyEmailValidation', () => {
      const Config = this.app.use('Adonis/Src/Config');
      return new BriteVerifyEmailValidationService(Config);
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
      const briteVerify = this.app.use('Services/BriteVerifyEmailValidation');

      if (briteVerify) {
        console.log('BriteVerify Email Validation service initialized');
      }
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
    }
  }
}

module.exports = BriteVerifyEmailValidationProvider;
