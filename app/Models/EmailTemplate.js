'use strict';

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model');

class EmailTemplate extends Model {
  user() {
    return this.belongsTo('App/Models/User', 'created_by', 'id');
  }

  emailBody() {
    return this.belongsTo('App/Models/EmailBody');
  }

  emailTemplateFolder() {
    return this.belongsTo('App/Models/EmailTemplateFolder');
  }

  bulkType() {
    return this.belongsTo('App/Models/BulkEmailScopeType');
  }
}

module.exports = EmailTemplate;
