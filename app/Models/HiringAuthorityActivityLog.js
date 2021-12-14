'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')

class HiringAuthorityActivityLog extends Model {
  activityLogType(){
    return this.hasOne('App/Models/ActivityLogType','activity_log_type_id','id').orderBy('created_at', 'desc')
  }

  user(){
    return this.belongsTo('App/Models/User')
  }

  bulkReference(){
    return this.hasOne('App/Models/HiringAuthorityBulkActivityReference')
  }
}

module.exports = HiringAuthorityActivityLog
