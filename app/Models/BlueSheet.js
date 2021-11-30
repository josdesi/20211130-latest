'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')

class BlueSheet extends Model {
  get jsonFields() {
    return ['interview_dates']
  }

  static boot() {
    super.boot()
    this.addTrait('@provider:Jsonable')
  }
  
  relocations() {
    return this.hasMany('App/Models/BlueSheetHasRelocation');
  }

  timeToStart(){
    return this.belongsTo('App/Models/TimeStartType')
  }

  candidateType(){
    return this.belongsTo('App/Models/CandidateType')
  }

  workTypeOption(){
    return this.belongsTo('App/Models/WorkTypeOption')
  }
}

module.exports = BlueSheet
