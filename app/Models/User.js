'use strict';

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model');

const { auditFields, userFields } = use('App/Helpers/Globals');
class User extends Model {

  static get hidden () {
    return ['email_signature']
  }

  static boot() {
    super.boot();
    this.addTrait('ModelQueryHelper');
  }

  /**
   * Returns the fields to hide for the model user
   *
   * @summary This scope method allows for a quick & easy way to hide the sensitive fiels of the model user, by calling User.query().hideSensitiveFields()... instead of importing the constans & then using setHidden()
   *
   * @param {Object} query - Obtained by the cascade method context, no need to be passed while calling it
   *
   * @return {Object} setHidden method filled out
   */
  static scopeHideSensitiveFields(query) {
    return query.setHidden([...userFields, ...auditFields]);
  }

  /**
   * Returns a common used builder including the basic information
   *
   * @summary This scope method allows for a quick implementation of the user the his personalInformation is needed
   *
   * @param {Object} query - Obtained by the cascade method context, no need to be passed while calling it
   *
   * @return {Object} user with personal information
   */
  static scopeWithPersonalInformation(query) {
    return query.hideSensitiveFields().with('personalInformation', (builder) => builder.hideSensitiveFields());
  }

  /**
   * Returns a common used builder including the full user information
   *
   * @summary This scope method allows for a quick implementation of the user model, with personalInformation, contact, address models alongside
   *
   * @param {Object} query - Obtained by the cascade method context, no need to be passed while calling it
   *
   * @return {Object} user with full personal information
   */
  static scopeWithFullInformation(query) {
    return query.hideSensitiveFields().with('personalInformation', (builder) =>
      builder
        .hideSensitiveFields()
        .with('contact', (builder) => builder.hideSensitiveFields())
        .with('address', (builder) =>
          builder
            .hideSensitiveFields()
            .with('city', (builder) => builder.with('state', (builder) => builder.with('country')))
        )
    );
  }

  /**
   * A relationship on tokens is required for auth to
   * work. Since features like `refreshTokens` or
   * `rememberToken` will be saved inside the
   * tokens table.
   *
   * @method tokens
   *
   * @return {Object}
   */
  tokens() {
    return this.hasMany('App/Models/Token');
  }

  status (){
    return this.hasOne('App/Models/UserStatus','user_status_id','id')
  }

  personalInformation(){
    return this.hasOne('App/Models/PersonalInformation','personal_information_id','id')
  }

  roles (){
    return this.hasMany('App/Models/UserHasRole')
  }

  permissions (){
    return this.manyThrough('App/Models/UserHasPermission','permission')
  }

  industries(){
    return this.manyThrough('App/Models/RecruiterHasIndustry','industry','id','recruiter_id')
  }

  specialties(){
    return this.manyThrough('App/Models/RecruiterHasIndustry','specialty','id','recruiter_id')
  }

  channelPartner(){
    return this.hasOne('App/Models/ChannelPartner', 'id','referee_id');
  }

  teamRelation(){
    return this.hasOne('App/Models/RecruiterHasIndustry', 'id','recruiter_id');
  }

  manager(){
    return this.hasOne('App/Models/User', 'manager_id','id');
  }
}

module.exports = User;
