'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')

class Specialty extends Model {
  static boot () {
    super.boot()
    this.addTrait('ModelQueryHelper');
  }
  
  industry() {
    return this.belongsTo('App/Models/Industry');
  }
  subspecialties(){
    return this.hasMany('App/Models/Subspecialty')
  }
}

module.exports = Specialty
