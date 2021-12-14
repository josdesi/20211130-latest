'use strict';

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model');

class CompanyTypeReassure extends Model {
  /**
   * Returns if the reassure is verified or not, depending on the param passed
   *
   * @summary A reassure can be quickly determined to be verified or if the verified_* fields are null or not, meaning that a ops has already verified such reassure
   *
   * @param {Object} query - Obtained by the cascade method context, no need to be passed while calling it
   * @param {Boolean} isVerified - To wether find a verified reassure, or not
   *
   * @return {Object} Query
   */
  static scopeIsVerified(query, isVerified) {
    if (isVerified) {
      query.where((builder) =>
      builder.whereNotNull('verification_date').whereNotNull('verified_by').whereNotNull('verified_company_type_id')
      );
    } else {
      query.where((builder) =>
        builder.whereNull('verification_date').whereNull('verified_by').whereNull('verified_company_type_id')
      );
    }
  }
}

module.exports = CompanyTypeReassure;
