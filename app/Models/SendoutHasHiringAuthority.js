'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')

class SendoutHasHiringAuthority extends Model {
  static boot () {
    super.boot()
    this.addTrait('ModelQueryHelper');
  }
  
  sendout() {
    return this.belongsTo('App/Models/Sendout');
  }

  hiringAuthority() {
    return this.belongsTo('App/Models/HiringAuthority');
  }
}

module.exports = SendoutHasHiringAuthority
