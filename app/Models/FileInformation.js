'use strict';

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model');

class FileInformation extends Model {
  file() {
    return this.belongsTo('App/Models/UserHasTempFile');
  }
}

module.exports = FileInformation;
