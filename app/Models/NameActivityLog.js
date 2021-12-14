'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')

class NameActivityLog extends Model {
  user(){
    return this.belongsTo('App/Models/User')
  }

  activityLogType(){
      return this.belongsTo('App/Models/ActivityLogType')
  }

  bulkReference(){
    return this.hasOne('App/Models/NameBulkActivityReference')
  }
}

module.exports = NameActivityLog
