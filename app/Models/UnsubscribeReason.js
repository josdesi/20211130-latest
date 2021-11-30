'use strict';

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model');

class UnsubscribeReason extends Model {
  type() {
    return this.belongsTo('App/Models/UnsubscribeReasonType');
  }
}

module.exports = UnsubscribeReason;
