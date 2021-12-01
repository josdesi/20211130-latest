'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')

class JobOrderActivityLog extends Model {
    user(){
        return this.belongsTo('App/Models/User')
    }

    activityLogType(){
        return this.hasOne('App/Models/ActivityLogType','activity_log_type_id','id')
    }

    bulkReference(){
        return this.hasOne('App/Models/JobOrderBulkActivityReference')
    }
}

module.exports = JobOrderActivityLog
