'use strict';

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model');

class UserHasTempFile extends Model {
  static boot () {
    super.boot()

    this.addHook('afterFind', 'FileHook.encodeFileUrl');
    this.addHook('afterFetch', 'FileHook.encodeFileUrl');
    this.addHook('afterCreate', 'FileHook.encodeFileUrl');
  }

  information() {
    return this.hasOne('App/Models/FileInformation');
  }
}

module.exports = UserHasTempFile;
