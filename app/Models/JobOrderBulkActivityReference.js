'use strict';

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model');

class JobOrderBulkActivityReference extends Model {
  activityLog() {
    return this.belongsTo('App/Models/JobOrderActivityLog');
  }
}

module.exports = JobOrderBulkActivityReference;
