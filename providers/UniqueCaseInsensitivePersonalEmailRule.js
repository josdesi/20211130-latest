'use strict'

const { ServiceProvider } = require('@adonisjs/fold')
const _ = require('lodash')


class UniqueCaseInsensitivePersonalEmailRule extends ServiceProvider {

  async uniqueCaseInsensitivePersonalEmail(data, field, message, args, get) {
    const Database = use('Database')
    const value = get(data, field)
    if (!value || typeof value != 'string') {
      /**
       * skip validation if value is not defined.
      */
      return
    }
    let [entityTable, entityId] = args;
    const query = Database.table(entityTable)
      .join('personal_informations', `${entityTable}.personal_information_id`, `personal_informations.id`)
      .join('contacts', 'personal_informations.contact_id', 'contacts.id')
      .whereRaw('lower(contacts.personal_email) = ?', value.toLowerCase())
      .first();
    
    if (entityId) query.whereNot(`${entityTable}.id`, entityId);
    
    const row = await query;
  
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
    Validator.extend('uniqueCaseInsensitivePersonalEmail', this.uniqueCaseInsensitivePersonalEmail)
  }
}

module.exports = UniqueCaseInsensitivePersonalEmailRule
