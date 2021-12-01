'use strict';

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model');
const { hiringAuthorityStatus } = use('App/Helpers/Globals');

class HiringAuthority extends Model {
  static boot () {
    super.boot()
    this.addTrait('ModelQueryHelper');
    this.addHook('beforeSave', async (hiringAuthorityInstance) => {
      hiringAuthorityInstance.full_name = hiringAuthorityInstance.first_name + ' ' + hiringAuthorityInstance.last_name 
    })
  }

  company() {
    return this.belongsTo('App/Models/Company');
  }

  specialty() {
    return this.belongsTo('App/Models/Specialty');
  }

  position() {
    return this.belongsTo('App/Models/Position');
  }

  subspecialty() {
    return this.belongsTo('App/Models/Subspecialty');
  }

  files() {
    return this.hasMany('App/Models/HiringAuthorityHasFile');
  }

  notes(){
    return this.hasMany('App/Models/HiringAuthorityNote')
  }

  activityLogs(){
    return this.hasMany('App/Models/HiringAuthorityActivityLog').orderBy('created_at', 'desc')
  }

  hiringAuthorityStatus(){
    return this.belongsTo('App/Models/HiringAuthorityStatus')
  }
}

module.exports = HiringAuthority;
