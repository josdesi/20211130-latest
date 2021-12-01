'use strict';

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model');

class Guarantee extends Model {
  sendout() {
    return this.belongsTo('App/Models/Sendout');
  }
}

module.exports = Guarantee;
