'use strict';

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model');

class CandidateTypeLog extends Model {
  createdBy() {
    return this.belongsTo('App/Models/User', 'created_by', 'id');
  }
  type(){
    return this.belongsTo('App/Models/CandidateType')
  }
}

module.exports = CandidateTypeLog;
