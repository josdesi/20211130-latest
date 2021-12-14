'use strict';

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model');

class NameBulkActivityReference extends Model {
  activityLog() {
    return this.belongsTo('App/Models/NameActivityLog');
  }
}

module.exports = NameBulkActivityReference;
