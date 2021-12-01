'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')

class UserHasRole extends Model {
  static boot() {
    super.boot();
    this.addTrait('ModelQueryHelper');
  }

  role() {
    return this.belongsTo('App/Models/Role');
  }
}

module.exports = UserHasRole
