'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')

class Placement extends Model {
  static boot () {
    super.boot()
    this.addTrait('ModelQueryHelper');
  }

  paymentScheme() {
    return this.belongsTo('App/Models/FeeAgreementPaymentScheme', 'fee_agreement_payment_scheme_id', 'id');
  }

  splits(){
    return this.hasMany('App/Models/PlacementSplit');
  }
  
  files() {
    return this.hasMany('App/Models/PlacementHasFile');
  }

  suggestedUpdates() {
    return this.hasMany('App/Models/PlacementSuggestedUpdate');
  }

  sendout() {
    return this.belongsTo('App/Models/Sendout','sendout_id','id');
  }

  invoices(){
    return this.hasMany('App/Models/PlacementInvoice');
  }

  status(){
    return this.belongsTo('App/Models/PlacementStatus',);
  }
  
  recruiter(){
    return this.hasOne('App/Models/User','created_by','id');
  }
}

module.exports = Placement
