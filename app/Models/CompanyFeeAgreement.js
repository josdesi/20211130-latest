'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')
const Database = use('Database');
class CompanyFeeAgreement extends Model {
  static boot() {
    super.boot()
    this.addTrait('ModelQueryHelper');
    this.addTrait('@provider:Jsonable');
  }
  company() {
    return this.belongsTo('App/Models/Company');
  }

  hiringAuthority() {
    return this.belongsTo('App/Models/HiringAuthority');
  }

  feeAgreementStatus() {
    return this.belongsTo('App/Models/FeeAgreementStatus');
  }

  currentDeclinator() {
    return this.belongsTo('App/Models/User', 'current_declinator_id', 'id');
  }

  productionDirector() {
    return this.belongsTo('App/Models/User', 'production_director_signer_id', 'id');
  }

  regional() {
    return this.belongsTo('App/Models/User', 'regional_director_id', 'id');
  }


  creator() {
    return this.belongsTo('App/Models/User', 'creator_id', 'id');
  }

  coach() {
    return this.belongsTo('App/Models/User', 'coach_id', 'id');
  }

  operationsValidator() {
    return this.belongsTo('App/Models/User', 'operations_validator_id', 'id');
  }

  eventLogs() {
    return this.hasMany('App/Models/FeeAgreementEventLog', 'id', 'fee_agreement_id')
      .whereRaw('event_type_id is not null and event_type_id in (select id from fee_agreement_event_types where show_in_history_log)')
      .orderBy(Database.raw('COALESCE(real_date, created_at)'), 'desc');
  }

  paymentScheme() {
    return this.belongsTo('App/Models/FeeAgreementPaymentScheme', 'fee_agreement_payment_scheme_id', 'id');
  }
  
  get jsonFields() {
    return ['cc_emails']
  }

}

module.exports = CompanyFeeAgreement
