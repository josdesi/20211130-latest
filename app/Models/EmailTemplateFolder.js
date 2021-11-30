'use strict';

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model');

class EmailTemplateFolder extends Model {
  emailTemplates() {
    return this.hasMany('App/Models/EmailTemplate');
  }

  childrenFolders() {
    return this.hasMany('App/Models/EmailTemplateFolder', 'id', 'parent_folder_id');
  }

  parentFolder() {
    return this.belongsTo('App/Models/EmailTemplateFolder', 'parent_folder_id', 'id');
  }

  /**
   * Returns the folders that are available to read for the user passed
   *
   * @summary The user can access the folder if: it is from a system (gpac), he created the folder or the folder is public
   *
   * @param {Object} query - Obtained by the cascade method context, no need to be passed while calling it
   * @param {Object} userId - The user that the query will be using for the match
   *
   * @return {Object} Query
   */
  static scopeUserAllowedRead(query, userId) {
    query.where((builder) =>
      builder.where('is_system_folder', true).orWhere('created_by', userId).orWhere('is_private', false)
    );
  }
}

module.exports = EmailTemplateFolder;
