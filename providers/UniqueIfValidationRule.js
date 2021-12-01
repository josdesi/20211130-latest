'use strict'

const { ServiceProvider } = require('@adonisjs/fold')


class UniqueIfValidationRule extends ServiceProvider {

  async uniqueIf(data, field, message, args, get) {
    const Database = use('Database')
    const value = get(data, field)
    if (!value) {
      /**
       * skip validation if value is not defined.
      */
      return
    }
    let [tableName, column, columnIf ] = args
    if(field.includes('.')){
      const splits = field.split('.')
      columnIf = `${splits[0]}.${splits.length < 3 ? columnIf : splits[1]+'.'+columnIf}`
    }
    if(!get(data, columnIf)){
      const row = await Database.table(tableName).where(column, value).first()
  
      if (row) {
        throw message
      }
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
    Validator.extend('uniqueIf', this.uniqueIf)
  }
}

module.exports = UniqueIfValidationRule
