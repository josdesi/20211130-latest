'use strict';

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model');

class Position extends Model {
  industries() {
    return this.belongsTo('App/Models/Industry');
  }
}

module.exports = Position;
