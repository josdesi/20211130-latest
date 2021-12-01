'use strict';

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model');

const { auditFields } = use('App/Helpers/Globals');

class Contact extends Model {
  static boot () {
    super.boot()
    this.addTrait('ModelQueryHelper');
  }

  /**
   * Returns the fields to hide for the model
   *
   * @summary This scope method allows for a quick & easy way to hide the sensitive fiels of the model
   *
   * @param {Object} query - Obtained by the cascade method context, no need to be passed while calling it
   *
   * @return {Object} setHidden method filled out
   */
  static scopeHideSensitiveFields(query) {
    return query.setHidden(['id', ...auditFields]);
  }
}

module.exports = Contact;
