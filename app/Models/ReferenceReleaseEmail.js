'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')

class ReferenceReleaseEmail extends Model {
  static boot() {
    super.boot();
    this.addTrait('ModelQueryHelper');
  }

  user(){
    return this.hasOne('App/Models/User','created_by','id')
  }

}

module.exports = ReferenceReleaseEmail
