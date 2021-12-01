'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')

class SourceType extends Model {
  static boot () {
    super.boot()
    this.addTrait('ModelQueryHelper');
  }
}

module.exports = SourceType
