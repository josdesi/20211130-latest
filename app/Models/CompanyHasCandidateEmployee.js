'use strict';

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model');

class CompanyHasCandidateEmployee extends Model {
  candidates() {
    return this.hasMany('App/Models/Candidate', 'candidate_id', 'id');
  }

  companies() {
    return this.hasMany('App/Models/Company', 'company_id', 'id');
  }
}

module.exports = CompanyHasCandidateEmployee;
