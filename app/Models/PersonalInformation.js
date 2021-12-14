'use strict';

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model');

const { auditFields, personalInformationFields } = use('App/Helpers/Globals');

class PersonalInformation extends Model {
  static boot () {
    super.boot()
    this.addTrait('ModelQueryHelper');
    this.addHook('beforeSave', async (personalInformationInstance) => {
      personalInformationInstance.full_name = `${personalInformationInstance.first_name} ${personalInformationInstance.last_name}` 
    })
  }

  /**
   * Returns the fields to hide for the model personalInformation
   *
   * @summary This scope method allows for a quick & easy way to hide the sensitive fiels of the model personalInformation, by calling PersonalInformation.query().hideSensitiveFields()... instead of importing the constans & then using setHidden()
   *
   * @param {Object} query - Obtained by the cascade method context, no need to be passed while calling it
   *
   * @return {Object} setHidden method filled out
   */
  static scopeHideSensitiveFields(query) {
    return query.setHidden([...personalInformationFields, ...auditFields]);
  }

  contact() {
    return this.belongsTo('App/Models/Contact');
  }

  address() {
    return this.belongsTo('App/Models/Address');
  }
}

module.exports = PersonalInformation;
