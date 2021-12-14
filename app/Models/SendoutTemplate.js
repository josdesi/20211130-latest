'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')

class SendoutTemplate extends Model {
  static boot() {
    super.boot()
    this.addTrait('@provider:Jsonable')
  }

  get jsonFields() {
    return ['bcc_emails']
  }
}

module.exports = SendoutTemplate
