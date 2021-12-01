'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')

class JobOrderHasFile extends Model {
  static boot () {
    super.boot()
    this.addTrait('ModelQueryHelper');
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
      return this.hasOne('App/Models/FileType','file_type_id','id');
  }
}

module.exports = JobOrderHasFile
