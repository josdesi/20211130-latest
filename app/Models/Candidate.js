'use strict';

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model');

class Candidate extends Model {
  static boot () {
    super.boot()
    this.addTrait('ModelQueryHelper');
  }
  
  personalInformation() {
    return this.hasOne('App/Models/PersonalInformation', 'personal_information_id', 'id');
  }
  industry() {
    return this.belongsTo('App/Models/Industry');
  }
  position() {
    return this.belongsTo('App/Models/Position');
  }
  recruiter() {
    return this.belongsTo('App/Models/User', 'recruiter_id', 'id');
  }
  files() {
    return this.hasMany('App/Models/CandidateHasFile');
  }
  blueSheets() {
    return this.hasMany('App/Models/BlueSheet');
  }
  status() {
    return this.belongsTo('App/Models/CandidateStatus', 'status_id', 'id');
  }
  sendouts() {
    return this.hasMany('App/Models/Sendout');
  }
  notes() {
    return this.hasMany('App/Models/CandidateNote');
  }
  sourceType() {
    return this.hasOne('App/Models/SourceType', 'source_type_id', 'id');
  }
  activityLogs() {
    return this.hasMany('App/Models/CandidateActivityLog');
  }
  specialty() {
    return this.belongsTo('App/Models/Specialty');
  }
  subspecialty() {
    return this.belongsTo('App/Models/Subspecialty');
  }
  jobOrders() {
    return this.manyThrough('App/Models/JobOrderHasCandidate', 'jobOrder');
  }
  createdBy() {
    return this.belongsTo('App/Models/User', 'created_by', 'id');
  }
  metrics() {
    return this.hasMany('App/Models/CandidateOperatingMetric');
  }
  typeLogs() {
    return this.hasMany('App/Models/CandidateTypeLog');
  }
  employerCompanies() {
    return this.manyThrough('App/Models/CompanyHasCandidateEmployee', 'companies');
  }
  additionalRecruiters(){
    return this.hasMany('App/Models/CandidateAdditionalRecruiter');
  }
}

module.exports = Candidate;
