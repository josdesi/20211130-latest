'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')

class HiringAuthorityFromName extends Model {
  static get table () {
    return 'hiring_authorities_from_names';
  }
}

module.exports = HiringAuthorityFromName
