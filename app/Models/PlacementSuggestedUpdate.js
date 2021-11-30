'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')

class PlacementSuggestedUpdate extends Model {
  static boot () {
    super.boot()
    this.addTrait('ModelQueryHelper');
  }

  user() {
    return this.belongsTo('App/Models/User', 'user_id', 'id');
  }
}

module.exports = PlacementSuggestedUpdate
