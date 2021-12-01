'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')

class Split extends Model {
    companyOwner() {
        return this.hasOne('App/Models/User','company_owner_id','id');
    }
    candidateOwner() {
        return this.hasOne('App/Models/User','candidate_owner_id','id');
    }
}

module.exports = Split
