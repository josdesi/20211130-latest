'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')

class Name extends Model {
  personalInformation() {
    return this.hasOne('App/Models/PersonalInformation','personal_information_id','id');
  }
  specialty(){
    return this.belongsTo('App/Models/Specialty')
  }
  subspecialty(){
    return this.belongsTo('App/Models/Subspecialty')
  }
  position() {
    return this.belongsTo('App/Models/Position');
  }
  sourceType(){
    return this.hasOne('App/Models/SourceType','source_type_id','id')
  }
  nameType(){
    return this.belongsTo('App/Models/NameType')
  }
  files() {
    return this.hasMany('App/Models/NameHasFile');
  }
  notes(){
    return this.hasMany('App/Models/NameNote')
  }
  activityLogs(){
    return this.hasMany('App/Models/NameActivityLog')
  }
  employerCompanies() {
    return this.manyThrough('App/Models/CompanyHasNameEmployee', 'companies');
  }
  nameStatus(){
    return this.belongsTo('App/Models/NameStatus')
  }
}

module.exports = Name
