'use strict';

/** @typedef {import('@adonisjs/framework/src/Request')} Request */
/** @typedef {import('@adonisjs/framework/src/Response')} Response */
/** @typedef {import('@adonisjs/framework/src/View')} View */

//Repositories
const BulkEmailMetricsRepository = new (use('App/Helpers/BulkEmailMetricsRepository'))();
const BulkEmailRepository = new (use('App/Helpers/BulkEmailRepository'))();
const BulkEmailMetricBuilder = use('App/Helpers/BulkEmailMetricBuilder');

//Utils
const appInsights = require('applicationinsights');
const SpreadSheet = use('SpreadSheet');
const Antl = use('Antl');

/**
 * Resourceful controller for interacting with bulkemailmetrics
 */
class BulkEmailMetricController {
  constructor() {
    this.bulkEmailMetricBuilder = new BulkEmailMetricBuilder();
  }

  /**
   * Downloads one bulk email metrics in the format desired (must be supported) & the data type specified
   * GET bulk-emails-metrics/:id/:format?type=
   *
   * @param {object} ctx
   * @param {object} ctx.auth
   * @param {object} ctx.params
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async downloadMetric({ params, request, auth, response }) {
    try {
      const bulkEmailId = params.id;
      const userId = auth.current.user.id;
      const { type, format } = request.only(['type', 'format']);

      const spreadSheet = new SpreadSheet(response, this.getSupportedFormat(format));

      const bulkEmail = await this.getBulkEmail(bulkEmailId, userId);
      if (!bulkEmail.success) return response.status(bulkEmail.code).send(bulkEmail);

      spreadSheet.addSheet(type, this.bulkEmailMetricBuilder.buildSpreadSheetMetricData(bulkEmail.data, type));

      const fileName = `Bulk-Email-Metrics-${new Date().toJSON()}`;
      spreadSheet.download(fileName);
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      const result = {
        success: false,
        code: 500,
        message: Antl.formatMessage('messages.error.internalServer', {
          action: 'downloading',
          entity: 'bulk metrics',
        }),
      };
      return response.status(result.code).send(result);
    }
  }

  getSupportedFormat(format) {
    const validFormats = ['xls', 'xlsx', 'csv', 'ods'];
    const defaultFormat = 'csv';
    const passedFormat = format ? format.toLowerCase() : '';
    return validFormats.includes(passedFormat) ? passedFormat : defaultFormat;
  }

  /**
   * Show a list of all bulkemailmetrics.
   * GET bulk-emails-metrics/:id
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   * @param {View} ctx.view
   */
  async index({ params, auth, response }) {
    try {
      const bulkEmailId = params.id;
      const userId = auth.current.user.id;

      const sentSearchProjectInfo = await BulkEmailRepository.quickInfo(bulkEmailId, userId);

      const bulkEmailResponse = await this.getBulkEmail(bulkEmailId, userId);
      if (!bulkEmailResponse.success) return response.status(bulkEmailResponse.code).send(bulkEmailResponse);
      const bulkEmail = bulkEmailResponse.data;

      const sendgridSuccess = bulkEmail.sendgridSuccessEvents;
      const sendgridFailures = bulkEmail.sendgridFailuresEvents;
      const emailsBlocked = bulkEmail.emails_blocked;
      const emailsInvalid = bulkEmail.emails_invalid;
      const emailsSent = bulkEmail.emails_sent;

      const bulkEmailEvents = {
        sendgridSuccess,
        sendgridFailures,
        emailsSent,
        emailsBlocked,
        emailsInvalid,
      };

      const metrics = {
        sent_emails: this.bulkEmailMetricBuilder.buildSendEmailsMetrics(bulkEmailEvents),
        open_emails: this.bulkEmailMetricBuilder.buildOpenEmailsMetrics(bulkEmailEvents),
        spam_emails: this.bulkEmailMetricBuilder.buildSpamEmailsMetrics(bulkEmailEvents),
        bounced_emails: this.bulkEmailMetricBuilder.buildBouncedEmailsMetrics(bulkEmailEvents),
      };

      const totalRecipients = this.bulkEmailMetricBuilder.getTotalRecipients(metrics);

      const openRatio = (metrics.open_emails.length / metrics.sent_emails.length) * 100;

      const metricsSummary = {
        original_meant_recipients: totalRecipients.length,
        sent_emails: metrics.sent_emails.length,
        open_emails: metrics.open_emails.length,
        spam_emails: metrics.spam_emails.length,
        bounced_emails: metrics.bounced_emails.length,
        open_ratio: openRatio ? openRatio : 0,
      };

      const result = {
        success: true,
        code: 200,
        data: { metricsSummary, metrics, sentSearchProjectInfo },
      };

      return response.status(result.code).send(result.success ? result.data : result);
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      const result = {
        success: false,
        code: 500,
        message: Antl.formatMessage('messages.error.internalServer', {
          action: 'getting',
          entity: 'bulk metrics',
        }),
      };
      return response.status(result.code).send(result);
    }
  }

  async getBulkEmail(bulkEmailId, userId) {
    const bulkEmailResponse = await BulkEmailMetricsRepository.getBulkEmailSent(bulkEmailId, userId);
    if (bulkEmailResponse.code !== 200) return bulkEmailResponse;

    const bulkEmail = bulkEmailResponse.data.toJSON();

    return { success: true, data: bulkEmail };
  }
}

module.exports = BulkEmailMetricController;
