'use strict';

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model');

class EmailBody extends Model {
  attachments() {
    return this.hasMany('App/Models/Attachment');
  }
}

module.exports = EmailBody;
