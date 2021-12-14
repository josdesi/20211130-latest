'use strict';

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model');

class Industry extends Model {
  static boot () {
    super.boot()
    this.addTrait('ModelQueryHelper');
  }

  positions(){
    return this.hasMany('App/Models/Position');
  }
  specialties(){
    return this.hasMany('App/Models/Specialty')
  }
}

module.exports = Industry;
