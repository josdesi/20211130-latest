'use strict';

//Models
const SendgridWebhookEvent = use('App/Models/SendgridWebhookEvent');

//Utils
const appInsights = require('applicationinsights');
const Database = use('Database');
const moment = use('moment');
const { DateFormats } = use('App/Helpers/Globals');

class SendgridEventsRepository {
  /**
   * Stores the sendgrid events of one bulk email sent
   *
   * @summary This method is expected to be called from the webhook, any events will be added (appended) to a email history by the sendgrid key
   *
   * @param {Object[]} sendgridSuccess - An array containing the deemed 'success' events
   * @param {Object[]} sendgridFailures - An array containing the deemed 'failures' events
   */
  async storeSendgridEvents(sendgridEvents) {
    const trx = await Database.beginTransaction();
    try {
      const useTimestamps = true;

      await this.bulkInsert(SendgridWebhookEvent, sendgridEvents, trx, useTimestamps);

      await trx.commit();

      return {
        success: true,
      };
    } catch (error) {
      await trx.rollback();
      appInsights.defaultClient.trackException({ exception: error });
      return {
        success: false,
        code: 500,
        message: 'There was a problem while storing the generic sendgrid events',
      };
    }
  }

  async bulkInsert(model, data, trx, useTimestamps) {
    if (useTimestamps === true) {
      const now = moment.utc().format(DateFormats.SystemDefault);
      for (const row of data) {
        row.created_at = now;
        row.updated_at = now;
      }
    }

    return await Database.table(model.table).transacting(trx).insert(data, ['*']);
  }
}

module.exports = SendgridEventsRepository;
