'use strict';

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model');

class City extends Model {
  static boot () {
    super.boot()
    this.addTrait('ModelQueryHelper');
  }

  state() {
    return this.belongsTo('App/Models/State');
  }
}

module.exports = City;
