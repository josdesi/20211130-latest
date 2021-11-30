'use strict';

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model');

class HiringAuthorityBulkActivityReference extends Model {
  activityLog() {
    return this.belongsTo('App/Models/HiringAuthorityActivityLog');
  }
}

module.exports = HiringAuthorityBulkActivityReference;
