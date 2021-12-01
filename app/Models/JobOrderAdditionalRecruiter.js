'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')

class JobOrderAdditionalRecruiter extends Model {
  static boot () {
    super.boot()
    this.addTrait('ModelQueryHelper');
  }

  recruiter(){
    return this.belongsTo('App/Models/User', 'recruiter_id', 'id');
  }
}

module.exports = JobOrderAdditionalRecruiter
