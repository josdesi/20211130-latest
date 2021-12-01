'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')
const { countBy } = use('lodash');

class JobOrderOperatingMetric extends Model {
  static get computed () {
    return ['percentage']
  }

  get jsonFields() {
    return ['checklist']
  }

  getPercentage ({checklist}) {
    return Math.round(Number((countBy(checklist,val => val.completed).true || 0)*100 / checklist.length))
  }

  static boot() {
    super.boot()
    this.addTrait('@provider:Jsonable')
  }

  
  recruiter() {
    return this.belongsTo('App/Models/User', 'created_by', 'id');
  }
}

module.exports = JobOrderOperatingMetric
