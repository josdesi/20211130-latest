'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')

class FeeAgreementStatus extends Model {
  group(){
    return this.belongsTo('App/Models/FeeAgreementStatusGroup','status_group_id','id')
  }
}

module.exports = FeeAgreementStatus
