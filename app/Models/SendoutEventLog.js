'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')

class SendoutEventLog extends Model {
  static boot() {
    super.boot()
    this.addTrait('@provider:Jsonable')
    this.addTrait('ModelQueryHelper');
    this.addHook('beforeCreate', async (instance) => {
      if (!instance.real_date) {
        instance.real_date = new Date();
      }
    })
  }

  get jsonFields() {
    return ['event_details']
  }

  user() {
    return this.hasOne('App/Models/User', 'triggered_by_user_id', 'id')
  }

  eventType() {
    return this.belongsTo('App/Models/SendoutEventType', 'event_type_id');
  }
}

module.exports = SendoutEventLog
