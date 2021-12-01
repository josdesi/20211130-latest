'use strict';

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model');

class SearchProjectCandidate extends Model {
  searchProject() {
    return this.belongsTo('App/Models/SearchProject');
  }
}

module.exports = SearchProjectCandidate;
