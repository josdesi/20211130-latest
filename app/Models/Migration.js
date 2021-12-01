'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')

class Migration extends Model {
  get jsonFields() {
    return ['config']
  }

  static boot() {
    super.boot()
    this.addTrait('@provider:Jsonable')
  }
}

module.exports = Migration
