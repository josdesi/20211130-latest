'use strict';

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model');

class CandidateBulkActivityReference extends Model {
  activityLog() {
    return this.belongsTo('App/Models/CandidateActivityLog');
  }
}

module.exports = CandidateBulkActivityReference;
