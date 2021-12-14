'use strict';

const { ServiceProvider } = require('@adonisjs/fold');
const AgendaService = require('./Service');

class AgendaProvider extends ServiceProvider {
  /**
   * Register namespaces to the IoC container
   *
   * @method register
   *
   * @return {void}
   */
  register() {
    console.log('Registering Agenda');

    this.app.singleton('Services/Agenda', () => {
      const Config = this.app.use('Adonis/Src/Config');
      return new AgendaService(Config, 'inventory');
    });

    this.app.singleton('Services/ActivityAgenda', () => {
      const Config = this.app.use('Adonis/Src/Config');
      return new AgendaService(Config, 'activity');
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
      this.app.use('Services/Agenda');
      this.app.use('Services/ActivityAgenda');

    } catch (error) {
      console.log(error);
    }
  }
}

module.exports = AgendaProvider;
