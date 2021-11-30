'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')

class SendoutEmailDetail extends Model {
  static boot() {
    super.boot()
    this.addTrait('@provider:Jsonable');
    this.addTrait('ModelQueryHelper');
  }

  get jsonFields() {
    return ['cc_emails', 'bcc_emails']
  }

  template() {
    return this.belongsTo('App/Models/SendoutTemplate');
  }
}

module.exports = SendoutEmailDetail
