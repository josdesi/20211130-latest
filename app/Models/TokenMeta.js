'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')

class TokenMeta extends Model {
  static get table () {
    return 'tokens_meta'
  }
}

module.exports = TokenMeta
