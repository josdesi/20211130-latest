'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')

class WhiteSheet extends Model {
  get jsonFields () {
    return [ 'preset_interview_dates' ]
  }

  static boot () {
    super.boot()
    this.addTrait('@provider:Jsonable')
  }

  jobOrderType(){
    return this.belongsTo('App/Models/JobOrderType')
  }
  workTypeOption(){
    return this.belongsTo('App/Models/WorkTypeOption')
  }

  companyFeeAgreement() {
    return this.belongsTo('App/Models/CompanyFeeAgreement','company_fee_agreement_id','id');
  }
}

module.exports = WhiteSheet
