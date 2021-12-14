'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')

class FeeAgreementEventLog extends Model {
  static boot() {
    super.boot()
    this.addTrait('@provider:Jsonable')
    this.addHook('beforeCreate', async (instance) => {
      if (!instance.real_date) {
        instance.real_date = new Date();
      }
    })
  }
  get jsonFields() {
    return ['event_details']
  }

  event() {
    return this.belongsTo('App/Models/FeeAgreementEventType', 'event_type_id');
  }

  resultStatus() {
    return this.belongsTo('App/Models/FeeAgreementStatus', 'result_fee_agreement_status_id');
  }
}

module.exports = FeeAgreementEventLog
