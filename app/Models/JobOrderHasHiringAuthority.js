'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')

class JobOrderHasHiringAuthority extends Model {
  hiringAuthority(){
    return this.belongsTo('App/Models/HiringAuthority')
  }
}

module.exports = JobOrderHasHiringAuthority
