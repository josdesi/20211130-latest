'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')

class ChannelPartner extends Model {
    static boot() {
        super.boot();
        this.addTrait('ModelQueryHelper');
    }
    referralUser(){
        return this.belongsTo('App/Models/User','referral_id','id')
    }

    refereeUser(){
        return this.belongsTo('App/Models/User','referee_id','id')
    }



}

module.exports = ChannelPartner
