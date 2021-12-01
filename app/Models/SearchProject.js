'use strict';

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model');

class SearchProject extends Model {
  recruiter() {
    return this.belongsTo('App/Models/User', 'created_by', 'id');
  }

  specialty() {
    return this.belongsTo('App/Models/Specialty');
  }

  subspecialty() {
    return this.belongsTo('App/Models/Subspecialty');
  }

  searchProjectType() {
    return this.belongsTo('App/Models/SearchProjectType');
  }

  state() {
    return this.belongsTo('App/Models/State');
  }

  city() {
    return this.belongsTo('App/Models/City');
  }

  searchProjectCandidates() {
    return this.hasMany('App/Models/SearchProjectCandidate');
  }

  searchProjectHiringAuthories() {
    return this.hasMany('App/Models/SearchProjectHiringAuthority');
  }

  searchProjectNames() {
    return this.hasMany('App/Models/SearchProjectName');
  }
}

module.exports = SearchProject;
