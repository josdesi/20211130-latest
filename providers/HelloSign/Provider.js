'use strict';

const { ServiceProvider } = require('@adonisjs/fold');
const HelloSignService = require('./Service');

class HelloSignProvider  extends ServiceProvider {
  /**
   * Register namespaces to the IoC container
   *
   * @method register
   *
   * @return {void}
   */
  register() {
    console.log('Registering HelloSign');

    this.app.singleton('Services/HelloSign', () => {
      const Config = this.app.use('Adonis/Src/Config');
      return new HelloSignService(Config);
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
      const HelloSign = this.app.use('Services/HelloSign');      
      if (HelloSign) {
        console.log('HelloSign service initialized');
      }
    } catch (error) {
      console.log(error);
    }
  }
}

module.exports = HelloSignProvider;
