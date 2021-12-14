'use strict';

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model');

class SearchProjectHiringAuthority extends Model {
  searchProject() {
    return this.belongsTo('App/Models/SearchProject');
  }
}

module.exports = SearchProjectHiringAuthority;
