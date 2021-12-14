'use strict';

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model');

class SendoutAttachment extends Model {
  static boot () {
    super.boot()
    this.addTrait('ModelQueryHelper');
  }
  
  static get computed() {
    return ['ext'];
  }

  getExt({ file_name }) {
    return /[^.]+$/.exec(file_name).pop();
  }

  sendout() {
    return this.belongsTo('App/Models/Sendout');
  }

  fileType() {
    return this.belongsTo('App/Models/FileType');
  }
}

module.exports = SendoutAttachment;
