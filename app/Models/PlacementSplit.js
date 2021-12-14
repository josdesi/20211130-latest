'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')

class PlacementSplit extends Model {
  static boot () {
    super.boot()
    this.addTrait('ModelQueryHelper');
  }

  user(){
    return this.hasOne('App/Models/User','user_id','id');
  }

  channelPartner(){
    return this.hasOne('App/Models/ChannelPartner','user_id','referee_id');
  }
}

module.exports = PlacementSplit
