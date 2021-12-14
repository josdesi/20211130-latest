'use strict';

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model');

class RecruiterHasIndustry extends Model {
  recruiter() {
    return this.hasOne('App/Models/User','recruiter_id','id');
  }

  coach() {
    return this.hasOne('App/Models/User','coach_id','id');
  }

  regional() {
    return this.hasOne('App/Models/User','regional_director_id','id');
  }

  industry() {
    return this.belongsTo('App/Models/Industry');
  }

  specialty() {
    return this.belongsTo('App/Models/Specialty');
  }

  state() {
    return this.belongsTo('App/Models/State');
  }
}

module.exports = RecruiterHasIndustry;
