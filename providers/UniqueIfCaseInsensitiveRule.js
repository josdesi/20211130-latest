'use strict'

const { ServiceProvider } = require('@adonisjs/fold')


class UniqueIfCaseInsensitiveRule extends ServiceProvider {

  async uniqueIfCaseInsensitive(data, field, message, args, get) {
    const Database = use('Database')
    const value = get(data, field)
    if (!value || typeof value != 'string') {
      /**
       * skip validation if value is not defined.
      */
      return
    }

    let [tableName, column, columnIf , idColumn, idValue] = args
    if(field.includes('.')){
      const splits = field.split('.')
      columnIf = `${splits[0]}.${splits.length < 3 ? columnIf : splits[1]+'.'+columnIf}`
    }
    if(!get(data, columnIf)){
      const lowerCaseValue = value.toLowerCase();
      const row = (idColumn && idValue) ? 
        await Database.table(tableName).whereRaw(`lower(${column}) = :lowerCaseValue and :idColumn: != :idValue`, { lowerCaseValue, idColumn, idValue }).first()
      : await Database.table(tableName).whereRaw(`lower(${column}) = ?`, lowerCaseValue).first();
    
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
    Validator.extend('uniqueIfCaseInsensitive', this.uniqueIfCaseInsensitive)
  }
}

module.exports = UniqueIfCaseInsensitiveRule
