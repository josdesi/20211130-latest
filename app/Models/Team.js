'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')

class Team extends Model {
  coach() {
    return this.belongsTo('App/Models/User', 'coach_id', 'id');
  }
}

module.exports = Team
