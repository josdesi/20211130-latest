'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')

class CompanyHasFile extends Model {
  static boot () {
    super.boot()
    this.addHook('afterFind', 'FileHook.encodeFileUrl');
    this.addHook('afterFetch', 'FileHook.encodeFileUrl');
    this.addHook('afterCreate', 'FileHook.encodeFileUrl');
  }

  static get computed () {
    return ['ext']
  }
  getExt ({file_name}) {
    return /[^.]+$/.exec(file_name).pop();
  }
  fileType() {
    return this.belongsTo('App/Models/FileType');
  }
}

module.exports = CompanyHasFile
