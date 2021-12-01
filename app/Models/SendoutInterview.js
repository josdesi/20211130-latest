'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')

class SendoutInterview extends Model {
  static boot() {
    super.boot()
    this.addTrait('@provider:Jsonable');
    this.addTrait('ModelQueryHelper');
  }

  get jsonFields() {
    return ['interview_range', 'cc_emails']
  }

  sendout() {
    return this.belongsTo('App/Models/Sendout');
  }

  interviewType() {
    return this.belongsTo('App/Models/SendoutInterviewType');
  }
}

module.exports = SendoutInterview
