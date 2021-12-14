'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')

class BlueSheetHasRelocation extends Model {
    city() {
        return this.hasOne('App/Models/City','city_id','id');
    }
}

module.exports = BlueSheetHasRelocation
