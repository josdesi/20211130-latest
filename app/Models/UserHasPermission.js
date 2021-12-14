'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')

class UserHasPermission extends Model {
  static boot() {
    super.boot();
    this.addTrait('ModelQueryHelper');
  }

  permission(){
    return this.belongsTo('App/Models/Permission')
  }
}

module.exports = UserHasPermission
