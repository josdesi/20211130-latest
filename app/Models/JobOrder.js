'use strict';

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model');

class JobOrder extends Model {
  static boot () {
    super.boot()
    this.addTrait('ModelQueryHelper');
  }
  
  company() {
    return this.belongsTo('App/Models/Company');
  }

  hiringAuthorities() {
    return this.manyThrough('App/Models/JobOrderHasHiringAuthority','hiringAuthority');
  }

  industry() {
    return this.belongsTo('App/Models/Industry');
  }

  position() {
    return this.belongsTo('App/Models/Position');
  }

  address() {
    return this.belongsTo('App/Models/Address');
  }

  status() {
    return this.belongsTo('App/Models/JobOrderStatus', 'status_id', 'id');
  }

  whiteSheet(){
    return this.hasOne('App/Models/WhiteSheet')
  }

  files() {
    return this.hasMany('App/Models/JobOrderHasFile');
  }
  sendouts(){
    return this.hasMany('App/Models/Sendout')
  }
  notes(){
    return this.hasMany('App/Models/JobOrderNote')
  }

  activityLogs(){
    return this.hasMany('App/Models/JobOrderActivityLog')
  }

  recruiter() {
    return this.belongsTo('App/Models/User','recruiter_id','id');
  }
  specialty(){
    return this.belongsTo('App/Models/Specialty')
  }
  subspecialty(){
    return this.belongsTo('App/Models/Subspecialty')
  }
  candidates(){
    return this.manyThrough('App/Models/JobOrderHasCandidate', 'candidate')
  }
  createdBy() {
    return this.belongsTo('App/Models/User','created_by','id');
  }
  metrics() {
    return this.hasMany('App/Models/JobOrderOperatingMetric');
  }
  typeLogs() {
    return this.hasMany('App/Models/JobOrderTypeLog');
  }
  additionalRecruiters(){
    return this.hasMany('App/Models/JobOrderAdditionalRecruiter');
  }
  sourceType() {
    return this.hasOne('App/Models/JobOrderSourceType', 'job_order_source_type_id', 'id');
  }
}

module.exports = JobOrder;
