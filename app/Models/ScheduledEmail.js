'use strict';

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model');

class ScheduledEmail extends Model {
  emailHistory() {
    return this.belongsTo('App/Models/EmailHistory');
  }
}

module.exports = ScheduledEmail;
