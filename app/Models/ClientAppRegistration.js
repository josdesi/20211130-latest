'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')

class ClientAppRegistration extends Model {
  static get primaryKey () {
    return 'client_id'
  }
}

module.exports = ClientAppRegistration
