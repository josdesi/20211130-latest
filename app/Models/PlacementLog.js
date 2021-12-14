'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')

class PlacementLog extends Model {
  static boot() {
    super.boot()
    this.addTrait('@provider:Jsonable');
    this.addTrait('ModelQueryHelper');
  }

  user(){
    return this.hasOne('App/Models/User','created_by','id')
  }

}

module.exports = PlacementLog
