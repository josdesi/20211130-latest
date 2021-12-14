'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')

class FeeAgreementPaymentScheme extends Model {
  static boot () {
    super.boot()
    this.addTrait('ModelQueryHelper');
  }
}

module.exports = FeeAgreementPaymentScheme
