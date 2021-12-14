'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')

class HiringAuthorityHasFile extends Model {
  static boot () {
    super.boot()
    this.addHook('afterFind', 'FileHook.encodeFileUrl');
    this.addHook('afterFetch', 'FileHook.encodeFileUrl');
    this.addHook('afterCreate', 'FileHook.encodeFileUrl');
  }
}

module.exports = HiringAuthorityHasFile
