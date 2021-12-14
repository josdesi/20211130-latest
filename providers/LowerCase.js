'use strict'

const { ServiceProvider } = require('@adonisjs/fold')


class LowerCase extends ServiceProvider {

  lowerCase(value) {
    if (typeof value !== 'string') return value;
    return value.toLocaleLowerCase();
  }
  /**
   * Register namespaces to the IoC container
   *
   * @method register
   *
   * @return {void}
   */
  register () {
    //
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
    const Validator = use('Validator')
    Validator.sanitizor.lowerCase =  this.lowerCase;
  }
}

module.exports = LowerCase
