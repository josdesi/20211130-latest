'use strict';

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model');

class Company extends Model {
  static boot () {
    super.boot()
    this.addTrait('ModelQueryHelper');
  }
  industry() {
    return this.belongsTo('App/Models/Industry');
  }

  contact() {
    return this.belongsTo('App/Models/Contact');
  }

  city() {
    return this.belongsTo('App/Models/City');
  }

  recruiter() {
    return this.belongsTo('App/Models/User','recruiter_id','id');
  }

  assignedRecruiters(){
    return this.hasMany('App/Models/CompanyRecruiterAssignment')
  }

  typeReassures(){
    return this.hasMany('App/Models/CompanyTypeReassure')
  }

  hiringAuthorities() {
    return this.hasMany('App/Models/HiringAuthority');
  }

  otherHiringAuthorities() {
    return this.manyThrough('App/Models/HiringAuthorityHasCompany', 'hiringAuthority');
  }

  candidateEmployees() {
    return this.manyThrough('App/Models/CompanyHasCandidateEmployee', 'candidates');
  }

  nameEmployees() {
    return this.manyThrough('App/Models/CompanyHasNameEmployee', 'names');
  }

  jobOrders() {
    return this.hasMany('App/Models/JobOrder');
  }
  notes(){
    return this.hasMany('App/Models/CompanyNote')
  }
  activityLogs(){
    return this.hasMany('App/Models/CompanyActivityLog')
  }
  specialty(){
    return this.belongsTo('App/Models/Specialty')
  }
  subspecialty(){
    return this.belongsTo('App/Models/Subspecialty')
  }
  createdBy() {
    return this.belongsTo('App/Models/User','created_by','id');
  }

  feeAgreements() {
    return this.hasMany('App/Models/CompanyFeeAgreement').orderBy('created_at', 'desc');
  }

  type() {
    return this.belongsTo('App/Models/CompanyType');
  }
  
  files() {
    return this.hasMany('App/Models/CompanyHasFile');
  }

}

module.exports = Company;
