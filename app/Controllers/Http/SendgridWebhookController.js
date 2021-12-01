'use strict';

/** @typedef {import('@adonisjs/framework/src/Request')} Request */
/** @typedef {import('@adonisjs/framework/src/Response')} Response */
/** @typedef {import('@adonisjs/framework/src/View')} View */

//Repositories
const BulkEmailRepository = new (use('App/Helpers/BulkEmailRepository'))();
const SendgridEventsRepository = new (use('App/Helpers/SendgridEventsRepository'))();
const Services = new (use('App/Helpers/Services'))();

//utils
const { EventWebhook } = require('@sendgrid/eventwebhook');
const appInsights = require('applicationinsights');
const Env = use('Env');
const { SendgridEventTypes, SendgridSuppressionGroups } = use('App/Helpers/Globals');

class SendgridWebhookController {
  /**
   * Verify if the request & response are signed, this allows to add security to the webhook
   *
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  verifyWebhookRequest(request, response) {
    const eventWebhook = new EventWebhook();

    const publicKey = Env.get('SENDGRID_WEBHOOK_VERIFICATION_KEY');
    const signature = response.request.headers['x-twilio-email-event-webhook-signature'];
    const timestamp = response.request.headers['x-twilio-email-event-webhook-timestamp'];
    const payload = request.raw(); //We need the raw body, as it is, with its trailing \r\n

    const key = eventWebhook.convertPublicKeyToECDSA(publicKey);

    return eventWebhook.verifySignature(key, payload, signature, timestamp);
  }

  validateOrigin(envOrigin = -1) {
    if (envOrigin === Env.get('NODE_ENV')) return true;

    return false;
  }

  /**
   * Webhook enpoint for sendgrid.
   * POST sendgrid-webhook
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async sendgridWebhook({ request, response }) {
    try {
      const sendgridRawEvents = request.body;

      const isVerified = this.verifyWebhookRequest(request, response);

      if (!isVerified) {
        appInsights.defaultClient.trackException({
          message: 'Something tried to access the webhook without being signed',
          body: request.raw(),
          headers: response.request.headers,
        });
        return response.status(401).send();
      }

      const storeBulkSendgridEventsPromise = this.storeBulkSendgridEvent(sendgridRawEvents);
      const storeSendgridEventsPromise = this.storeSendgridEvent(sendgridRawEvents);

      const [storeBulkSendgridEvents, storeSendgridEvents] = await Promise.all([
        storeBulkSendgridEventsPromise,
        storeSendgridEventsPromise,
      ]);

      return response.status(200).send();
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
      return response.status(500).send();
    }
  }

  async storeBulkSendgridEvent(sendgridRawEvents) {
    const bulkSendgridEvents = {};

    for (const key of Object.keys(sendgridRawEvents)) {
      const sendgridRawEvent = sendgridRawEvents[key];
      const bulkBatchId = sendgridRawEvent.bulkBatchId;

      if (bulkBatchId) {
        if (!bulkSendgridEvents[bulkBatchId]) bulkSendgridEvents[bulkBatchId] = { failEvents: [], successEvents: [] };

        const pushToSuccessEvents = (sendgridRawEvent, bulkBatchId) =>
          bulkSendgridEvents[bulkBatchId].successEvents.push(this.buildBulkEventBody(sendgridRawEvent, bulkBatchId));
        const pushToFailuresEvents = (sendgridRawEvent, bulkBatchId) =>
          bulkSendgridEvents[bulkBatchId].failEvents.push(this.buildBulkEventBody(sendgridRawEvent, bulkBatchId));

        switch (sendgridRawEvent.event) {
          case SendgridEventTypes.delivered:
          case SendgridEventTypes.open:
            pushToSuccessEvents(sendgridRawEvent, bulkBatchId);
            break;

          case SendgridEventTypes.bounce:
          case SendgridEventTypes.blocked:
          case SendgridEventTypes.spamreport:
          case SendgridEventTypes.dropped:
            pushToFailuresEvents(sendgridRawEvent, bulkBatchId);
            break;

          case SendgridEventTypes.group_unsubscribe:
            {
              const suppresionId = await Services.getSendgridSuppressionGroup(SendgridSuppressionGroups.Bulking);

              //Create unsubscribe in fortpac too
              await BulkEmailRepository.checkEmailSubscriptionStatus(
                sendgridRawEvent.email,
                suppresionId,
                sendgridRawEvent.timestamp ? sendgridRawEvent.timestamp * 1000 : 'null'
              );
              pushToFailuresEvents(sendgridRawEvent, bulkBatchId);
            }
            break;

          case SendgridEventTypes.group_resubscribe:
            {
              const suppresionId = await Services.getSendgridSuppressionGroup(SendgridSuppressionGroups.Bulking);

              //Delete unsubscribe in fortpac too
              await BulkEmailRepository.checkEmailSubscriptionStatus(
                sendgridRawEvent.email,
                suppresionId,
                sendgridRawEvent.timestamp ? sendgridRawEvent.timestamp * 1000 : 'null'
              );
              pushToSuccessEvents(sendgridRawEvent, bulkBatchId);
            }
            break;

          default:
            pushToFailuresEvents(sendgridRawEvent, bulkBatchId);
            break;
        }
      }
    }

    const storeBulkSendgridEventsPromise = [];
    for (const bulkBatchId of Object.keys(bulkSendgridEvents)) {
      const bulkSendgridEvent = bulkSendgridEvents[bulkBatchId];

      if (bulkSendgridEvent.successEvents.length <= 0 && bulkSendgridEvent.failEvents.length <= 0) continue;

      storeBulkSendgridEventsPromise.push(
        BulkEmailRepository.storeBulkSendgridEvents(bulkSendgridEvent.successEvents, bulkSendgridEvent.failEvents)
      );
    }

    await Promise.all(storeBulkSendgridEventsPromise);
  }

  buildBulkEventBody(rawEvent, bulkBatchId) {
    return {
      email: rawEvent.email,
      sendgrid_id: bulkBatchId,
      event: rawEvent.event,
      reason: rawEvent.reason ? rawEvent.reason : null,
      timestamp: rawEvent.timestamp ? new Date(rawEvent.timestamp * 1000) : null, //Sendgrid uses unix timestamp,
      raw_event: rawEvent,
    };
  }

  async storeSendgridEvent(sendgridRawEvents) {
    const sendgridEvents = [];

    for (const key of Object.keys(sendgridRawEvents)) {
      const sendgridRawEvent = sendgridRawEvents[key];

      sendgridEvents.push(this.buildEventBody(sendgridRawEvent));
    }

    const storedSendgridEvents = await SendgridEventsRepository.storeSendgridEvents(sendgridEvents);
  }

  buildEventBody(rawEvent) {
    return {
      email: rawEvent.email,
      sg_message_id: rawEvent.sg_message_id,
      event: rawEvent.event,
      reason: rawEvent.reason ? rawEvent.reason : null,
      timestamp: rawEvent.timestamp ? new Date(rawEvent.timestamp * 1000) : null, //Sendgrid uses unix timestamp,
      raw_event: rawEvent,
    };
  }
}

module.exports = SendgridWebhookController;
