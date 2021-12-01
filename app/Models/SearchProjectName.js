'use strict';

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model');

class SearchProjectName extends Model {
  searchProject() {
    return this.belongsTo('App/Models/SearchProject');
  }
}

module.exports = SearchProjectName;
