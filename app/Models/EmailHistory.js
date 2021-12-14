'use strict';

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model');

const nullToEmptyArray = (field) => (field === null ? [] : field);
const { SendgridEventTypes } = use('App/Helpers/Globals');
const SuccessEvents = [SendgridEventTypes.delivered, SendgridEventTypes.open, SendgridEventTypes.group_resubscribe];
const FailuresEvents = [
  SendgridEventTypes.bounce,
  SendgridEventTypes.blocked,
  SendgridEventTypes.spamreport,
  SendgridEventTypes.dropped,
  SendgridEventTypes.drop,
  SendgridEventTypes.group_unsubscribe,
];

class EmailHistory extends Model {
  get jsonFields() {
    return ['emails_sent', 'emails_blocked', 'emails_invalid'];
  }

  getEmailsSent(field) {
    const result = nullToEmptyArray(field);
    return result;
  }

  getEmailsBlocked(field) {
    const result = nullToEmptyArray(field);
    return result;
  }

  getEmailsInvalid(field) {
    const result = nullToEmptyArray(field);
    return result;
  }

  getSendgridSuccess(field) {
    const result = nullToEmptyArray(field);
    return result;
  }

  getSendgridFailures(field) {
    const result = nullToEmptyArray(field);
    return result;
  }

  static boot() {
    super.boot();
    this.addTrait('@provider:Jsonable');
  }

  user() {
    return this.belongsTo('App/Models/User', 'created_by', 'id');
  }

  emailBody() {
    return this.belongsTo('App/Models/EmailBody');
  }

  searchProject() {
    return this.belongsTo('App/Models/SearchProject');
  }

  emailTemplate() {
    return this.belongsTo('App/Models/EmailTemplate');
  }

  scheduledEmail() {
    return this.hasOne('App/Models/ScheduledEmail');
  }

  bulkType() {
    return this.belongsTo('App/Models/BulkEmailScopeType');
  }

  marketingCandidates() {
    return this.manyThrough('App/Models/BulkEmailMarketingCandidate', 'candidates');
  }

  recruitingJobOrder() {
    return this.manyThrough('App/Models/BulkEmailRecruitingJobOrder', 'jobOrders');
  }

  sendgridSuccessEvents() {
    return this.hasMany('App/Models/BulkEmailSendgridWebhookEvent', 'sendgrid_id', 'sendgrid_id');
  }

  sendgridFailuresEvents() {
    return this.hasMany('App/Models/BulkEmailSendgridWebhookEvent', 'sendgrid_id', 'sendgrid_id');
  }

  failureMessage() {
    return this.hasOne('App/Models/BulkEmailFailureMessage');
  }

  /**
   * Returns the Sendgrid success events
   *
   * @summary A sendgrid success event is defined by either
   *
   * @param {Object} query - Obtained by the cascade method context, no need to be passed while calling it
   *
   * @return {Object} Sendgrid success events
   */
  static scopeSendgridSuccessEvents(query) {
    return query.with('sendgridSuccessEvents', (builder) => {
      builder.whereIn('event', SuccessEvents);
    });
  }

  /**
   * Returns the Sendgrid failures events
   *
   * @summary A sendgrid success event is defined by either
   *
   * @param {Object} query - Obtained by the cascade method context, no need to be passed while calling it
   *
   * @return {Object} Sendgrid success events
   */
  static scopeSendgridFailuresEvents(query) {
    return query.with('sendgridFailuresEvents', (builder) => {
      builder.whereIn('event', FailuresEvents);
    });
  }
}

module.exports = EmailHistory;
