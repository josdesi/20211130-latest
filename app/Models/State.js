'use strict';

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model');

class State extends Model {
  static boot () {
    super.boot()
    this.addTrait('ModelQueryHelper');
  }

  static get hidden() {
    return ['created_at', 'updated_at', 'created_by', 'updated_by'];
  }

  country() {
    return this.belongsTo('App/Models/Country');
  }
}

module.exports = State;
