'use strict';

const { ServiceProvider } = require('@adonisjs/fold');
const DocuSignService = require('./Service');

class DocuSignProvider extends ServiceProvider {
  /**
   * Register namespaces to the IoC container
   *
   * @method register
   *
   * @return {void}
   */
  register() {
    console.log('Registering DocuSign');

    this.app.singleton('Services/DocuSign', () => {
      const Config = this.app.use('Adonis/Src/Config');
      return new DocuSignService(Config);
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
      const notification = this.app.use('Services/DocuSign');      
      if (notification) {
        console.log('DocuSign service initialized');
      }
    } catch (error) {
      console.log(error);
    }
  }
}

module.exports = DocuSignProvider;
