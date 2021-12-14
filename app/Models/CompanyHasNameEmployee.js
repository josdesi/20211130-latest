'use strict';

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model');

class CompanyHasNameEmployee extends Model {
  names() {
    return this.hasMany('App/Models/Name', 'name_id', 'id');
  }

  companies() {
    return this.hasMany('App/Models/Company', 'company_id', 'id');
  }
}

module.exports = CompanyHasNameEmployee;
