'use strict';

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model');

class BulkEmailMarketingCandidate extends Model {
  candidates() {
    return this.hasMany('App/Models/Candidate', 'candidate_id', 'id');
  }
}

module.exports = BulkEmailMarketingCandidate;
