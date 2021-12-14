'use strict';

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model');

class CoachHasIndustry extends Model {
  coach() {
    return this.belongsTo('App/Models/User','coach_id','id');
  }

  industry() {
    return this.belongsTo('App/Models/Industry');
  }
}

module.exports = CoachHasIndustry;
