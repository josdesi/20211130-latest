'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')

class JobOrderHasCandidate extends Model {
  candidate(){
    return this.hasMany('App/Models/Candidate','candidate_id','id')
  }
  jobOrder(){
    return this.hasMany('App/Models/JobOrder','job_order_id','id')
  }
}

module.exports = JobOrderHasCandidate
