'use strict'

const { ServiceProvider } = require('@adonisjs/fold')


class UniqueCaseInsensitiveRule extends ServiceProvider {

  async uniqueCaseInsensitive(data, field, message, args, get) {
    const Database = use('Database')
    const value = get(data, field)
    if (!value || typeof value != 'string') {
      /**
       * skip validation if value is not defined.
      */
      return
    }
    let [tableName, column, idColumn, idValue] = args
    const lowerCaseValue = value.toLowerCase();
    const row = (idColumn && idValue) ? 
      await Database.table(tableName).whereRaw(`lower(${column}) = ? and id != ?`, [lowerCaseValue, idValue]).first()
    : await Database.table(tableName).whereRaw(`lower(${column}) = ?`, lowerCaseValue).first();
  
    if (row) {
      throw message
    }
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
    Validator.extend('uniqueCaseInsensitive', this.uniqueCaseInsensitive)
  }
}

module.exports = UniqueCaseInsensitiveRule
