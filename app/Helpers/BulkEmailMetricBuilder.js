'use strict';

//Utils
const { uniqBy } = use('lodash');
const moment = use('moment');
const Antl = use('Antl');

// Constants
const { DateFormats, SendgridEventTypes } = use('App/Helpers/Globals');
const isSentEvent = (event) => event === SendgridEventTypes.delivered;
const isOpenEvent = (event) => event === SendgridEventTypes.open;
const isBouncedEvent = (event) =>
  event === SendgridEventTypes.bounce ||
  event === SendgridEventTypes.blocked ||
  event === SendgridEventTypes.dropped ||
  event === SendgridEventTypes.drop;
const isSpamEvent = (event) =>
  event === SendgridEventTypes.spamreport || event === SendgridEventTypes.group_unsubscribe;

class BulkEmailMetricBuilder {
  /**
   * Builds the generic body used in the metric
   *
   * @param {Object} eventData - An object containing the event data
   * @param {String} eventData.email - The item's email
   * @param {String} eventData.full_name - The item's name
   * @param {Date} eventData.timestamp - The date the event happened
   * @param {String} eventData.status - The event status
   * @param {String} eventData.reason - The event reason
   *
   * @returns JSON - Body builded
   */
  buildMetricBody(eventData) {
    const { email, full_name: name = 'Contact name not found', timestamp, status, reason } = eventData;
    const formatedDate = timestamp ? moment(timestamp).format(DateFormats.SystemDefault) : 'Timestamp not available';

    return {
      email,
      name,
      date: formatedDate,
      status,
      reason,
    };
  }

  /**
   * Returns an array of the total of recipients the bulk was MEANT to be sent to
   *
   * @description This methods 'merges' those candidates that were sent, were bounced, blocked etc. Since the sum of those emails make the original recipients, even if they didn't passed something
   *
   * @param {Object} metrics - The metric obtained
   * @param {Object[]} sent_emails - The emails that were truly delivered
   * @param {Object[]} open_emails - The emails that were open
   * @param {Object[]} spam_emails - The emails that were reported as spam or caused an usubscribe
   * @param {Object[]} bounced_emails - The emails that blocked, invalid, bounced, deferred, dropped... those that failed to be delivered
   *
   * @returns Array of total recipients
   */
  getTotalRecipients({ sent_emails, bounced_emails }) {
    //Spam belongs inside sent emails, I mean if they were reported as spam or caused an unsubscribe, tham means they were delivered right?
    //Open belongs inside sent too, because... yeah
    //Only sent & bounced emails are exclusive
    return [...sent_emails, ...bounced_emails];
  }

  buildEventArray(array, keys) {
    return array.map((row) => {
      return keys.map((key) => row[key]);
    });
  }

  /**
   * Returns an array of arrays containing the vents, formated to be used in an SpreadSheet
   *
   * @description This builds an array of events of the bulk data passed, a type can be passed, making the array to only return the desired category
   *
   * @param {Object} bulkMetricsData - The bulk metric data, should have the events that happened to the bulk
   * @param {Object[]} bulkMetricsData.sendgridSuccessEvents - The sendgrid success events, these are obtained after sending the bulk & when sendgrid detects something
   * @param {Object[]} bulkMetricsData.sendgridFailuresEvents - The sendgrid failure events, these are obtained after sending the bulk & when sendgrid detects something
   * @param {Object[]} bulkMetricsData.emails_sent - The sent emails, these are the ones that fortpac sent to sendgrid, but that doesn't mean they were delivered
   * @param {Object[]} bulkMetricsData.emails_blocked - The blocked emails that FP stopped from being sent
   * @param {Object[]} bulkMetricsData.emails_invalid - The invalid emails that FP stopped from being sent
   * @param {String} type - The event types, open, send, spam or bounced; If none is passed, all are returned
   *
   * @returns Array of total recipients
   */
  buildSpreadSheetMetricData(bulkMetricsData, type) {
    const {
      sendgridSuccessEvents: sendgridSuccess = [],
      sendgridFailuresEvents: sendgridFailures = [],
      emails_sent: emailsSent = [],
      emails_blocked: emailsBlocked = [],
      emails_invalid: emailsInvalid = [],
    } = bulkMetricsData;

    const bulkEmailEvents = {
      sendgridSuccess,
      sendgridFailures,
      emailsSent,
      emailsBlocked,
      emailsInvalid,
    };

    const columns = [
      { name: 'Email', key: 'email' },
      { name: 'Name', key: 'name' },
      { name: 'Date', key: 'date' },
      { name: 'Status', key: 'status' },
      { name: 'Reason', key: 'reason' },
    ];
    const columnNames = columns.map((column) => column.name);
    const columnKeys = columns.map((column) => column.key);

    const ssDataArray = [columnNames];

    const builtSendEmailMetrics = this.buildSendEmailsMetrics(bulkEmailEvents);
    const builtOpenEmailMetrics = this.buildOpenEmailsMetrics(bulkEmailEvents);
    const builtSpamEmailMetrics = this.buildSpamEmailsMetrics(bulkEmailEvents);
    const builtBouncedEmailMetrics = this.buildBouncedEmailsMetrics(bulkEmailEvents);

    switch (type) {
      case 'send': {
        const formatedSentEmails = this.buildEventArray(builtSendEmailMetrics, columnKeys);
        ssDataArray.push(...formatedSentEmails);
        break;
      }

      case 'open': {
        const formatedOpenEmails = this.buildEventArray(builtOpenEmailMetrics, columnKeys);
        ssDataArray.push(...formatedOpenEmails);
        break;
      }

      case 'spam': {
        const formatedSpamEmails = this.buildEventArray(builtSpamEmailMetrics, columnKeys);
        ssDataArray.push(...formatedSpamEmails);
        break;
      }

      case 'bounced': {
        const formatedBouncedEmails = this.buildEventArray(builtBouncedEmailMetrics, columnKeys);
        ssDataArray.push(...formatedBouncedEmails);
        break;
      }

      default: {
        const formatedSentEmails = this.buildEventArray(builtSendEmailMetrics, columnKeys);
        ssDataArray.push(...formatedSentEmails);

        const formatedOpenEmails = this.buildEventArray(builtOpenEmailMetrics, columnKeys);
        ssDataArray.push(...formatedOpenEmails);

        const formatedSpamEmails = this.buildEventArray(builtSpamEmailMetrics, columnKeys);
        ssDataArray.push(...formatedSpamEmails);

        const formatedBouncedEmails = this.buildEventArray(builtBouncedEmailMetrics, columnKeys);
        ssDataArray.push(...formatedBouncedEmails);

        break;
      }
    }

    return ssDataArray;
  }

  /**
   * Returns the emails that were sent successfully, that mean only those that were delivered by sendgrid & no bounce/drop/ or any other failure event happened to the email
   *
   * @summary This method just returns the delivered emails by sendgrid, those emails that have a failure of delivery (bounce, blocked or dropped) are removed,
   * BUT if it was opened (open event) then is added back again as delivered
   *
   * @param {Object} bulkEmailEvents - An object containing the bulk email events
   * @param {Object[]} bulkEmailEvents.sendgridSuccess - Array of events that are deemed success, like delivery & opened
   * @param {Object[]} bulkEmailEvents.sendgridFailures - Array of events that are deemed failures, like bounce, blocked, dropped, smap report, etc.
   * @param {Object[]} bulkEmailEvents.emailsSent - Array that initially were sent to sendgrid, this cointains critical information like the email item id, since sendgrid events just contains an email as reference
   *
   * @return {Object[]} JSON of events deemed success
   */
  buildSendEmailsMetrics(bulkEmailEvents) {
    const { sendgridSuccess, sendgridFailures, emailsSent } = bulkEmailEvents;

    const rawBouncedEmails = sendgridFailures.filter((row) => isBouncedEvent(row.event));
    const isEmailBounced = (validatingEmail) => rawBouncedEmails.some(({ email }) => email === validatingEmail);

    const rawSentEmails = sendgridSuccess.filter((row) => isSentEvent(row.event) && !isEmailBounced(row.email));
    const uniqRawSentEmails = uniqBy(rawSentEmails.reverse(), 'email');

    const sendEmails = this.addNameToEmails(uniqRawSentEmails, emailsSent);

    return sendEmails.map((row) =>
      this.buildMetricBody({
        ...row,
        status: 'delivered',
        reason: Antl.formatMessage('bulkMetrics.send.delivered'),
      })
    );
  }

  /**
   * Returns the emails that were opened successfully
   *
   * @summary This method just returns the opened emails, Sendgrid detects this via an invisible image BUT if the user doesn't load suck image, even if he opened it Sendgrid can't tell
   *
   * @param {Object} bulkEmailEvents - An object containing the bulk email events
   * @param {Object[]} bulkEmailEvents.sendgridSuccess - Array of events that are deemed success, like delivery & opened
   * @param {Object[]} bulkEmailEvents.sendgridFailures - Array of events that are deemed failures, like bounce, blocked, dropped, smap report, etc.
   * @param {Object[]} bulkEmailEvents.emailsSent - Array that initially were sent to sendgrid, this cointains critical information like the email item id, since sendgrid events just contains an email as reference
   *
   * @return {Object[]} JSON of events deemed success
   */
  buildOpenEmailsMetrics(bulkEmailEvents) {
    const { sendgridSuccess, sendgridFailures, emailsSent } = bulkEmailEvents;

    const rawBouncedEmails = sendgridFailures.filter((row) => isBouncedEvent(row.event));
    const isEmailBounced = (validatingEmail) => rawBouncedEmails.some(({ email }) => email === validatingEmail);

    const rawOpenEmails = sendgridSuccess.filter((row) => isOpenEvent(row.event) && !isEmailBounced(row.email));
    const uniqRawOpenEmails = uniqBy(rawOpenEmails.reverse(), 'email');

    const openEmails = this.addNameToEmails(uniqRawOpenEmails, emailsSent);

    return openEmails.map((row) => this.buildMetricBody({ ...row, status: 'open', reason: '' }));
  }

  /**
   * Returns the emails that were Spam, that means those that were reported as spam & those that caused an unsubscribe... :(
   *
   * @summary This method just returns the reported as spam & which emails unsubscribed from us due to 'this' bulk, sadly we cannot know if an email got caught as spam
   *
   * @param {Object} bulkEmailEvents - An object containing the bulk email events
   * @param {Object[]} bulkEmailEvents.emailsSent - Array that initially were sent to sendgrid, this cointains critical information like the email item id, since sendgrid events just contains an email as reference
   * @param {Object[]} bulkEmailEvents.sendgridFailures - Array of events that are deemed failures, like bounce, blocked, dropped, smap report, etc.
   *
   * @return {Object[]} JSON of events deemed success
   */
  buildSpamEmailsMetrics(bulkEmailEvents) {
    const { sendgridFailures, emailsSent } = bulkEmailEvents;

    const rawSpamEmails = sendgridFailures.filter((row) => isSpamEvent(row.event));
    const uniqRawSpamEmails = uniqBy(rawSpamEmails.reverse(), 'email');

    const sendgridReportedSpamEmails = this.addNameToEmails(uniqRawSpamEmails, emailsSent);

    return sendgridReportedSpamEmails.map((row) => {
      let reason;
      switch (row.event) {
        case SendgridEventTypes.group_unsubscribe:
          reason = Antl.formatMessage('bulkMetrics.spam.group_unsubscribe');
          break;

        case SendgridEventTypes.spamreport:
          reason = Antl.formatMessage('bulkMetrics.spam.spamreport');
          break;

        default:
          reason = row.reason;
          break;
      }

      return this.buildMetricBody({
        ...row,
        status: row.event,
        reason: reason ? reason : Antl.formatMessage('bulkMetrics.spam.default'),
      });
    });
  }

  /**
   * Returns the emails that were bounced from being received
   *
   * @summary This method just returns the emails that were blocked by our system, due to the rules like the recipient being a client, wrong bulk scope, opt out or unsubscribe,
   *  here the sendgrid events are returned too, like a bounce, drop or a block, finally the emails deemed invalid are grouped here, liket those deemed wrong by the sendgrid validation
   *  or the recipient didn't even had a email or didn't meet the minimum requirement of having an employer (company)
   *
   * @param {Object} bulkEmailEvents - An object containing the bulk email events
   * @param {Object[]} bulkEmailEvents.sendgridFailures - Array of events that are deemed failures, like bounce, blocked, dropped, smap report, etc.
   * @param {Object[]} bulkEmailEvents.emailsSent - Array that initially were sent to sendgrid, this cointains critical information like the email item id, since sendgrid events just contains an email as reference
   * @param {Object[]} bulkEmailEvents.emailsBlocked - The emails that were block in Fortpac, contains the email, item id & other critical information
   * @param {Object[]} bulkEmailEvents.emailsInvalid - The emails that were deemed invalid in Fortpac, contains the email, item id & other critical information
   *
   * @return {Object[]} JSON of events deemed success
   */
  buildBouncedEmailsMetrics(bulkEmailEvents) {
    const { sendgridFailures, emailsSent, emailsBlocked, emailsInvalid } = bulkEmailEvents;

    //Blocked events, these happens in our backend business rules/optouts
    const blockedEmailsJSON = emailsBlocked.map((row) => {
      const buildBlockedMetricBody = (reason) => {
        return this.buildMetricBody({ ...row, timestamp: row.created_at, status: 'blocked', reason });
      };

      switch (row.type) {
        case SendgridEventTypes.client:
          return buildBlockedMetricBody(Antl.formatMessage('bulkMetrics.blocked.client'));

        case SendgridEventTypes.marketing:
          return buildBlockedMetricBody(Antl.formatMessage('bulkMetrics.blocked.marketing'));

        case SendgridEventTypes.similarmarketing:
          return buildBlockedMetricBody(Antl.formatMessage('bulkMetrics.blocked.similarmarketing'));

        case SendgridEventTypes.clientsignedcompanymarketing:
          return buildBlockedMetricBody(Antl.formatMessage('bulkMetrics.blocked.clientsignedcompanymarketing'));

        case SendgridEventTypes.recruiting:
          return buildBlockedMetricBody(Antl.formatMessage('bulkMetrics.blocked.recruiting'));

        case SendgridEventTypes.scope:
          return buildBlockedMetricBody(Antl.formatMessage('bulkMetrics.blocked.scope'));

        case SendgridEventTypes.unsubscribe:
          return buildBlockedMetricBody(Antl.formatMessage('bulkMetrics.blocked.unsubscribe'));

        case SendgridEventTypes.candidatestatus:
          return buildBlockedMetricBody(Antl.formatMessage('bulkMetrics.blocked.candidatestatus'));

        case SendgridEventTypes.optout:
          return buildBlockedMetricBody(Antl.formatMessage('bulkMetrics.blocked.optout'));

        default:
          return buildBlockedMetricBody(Antl.formatMessage('bulkMetrics.blocked.default'));
      }
    });

    //Sendgrid failures events, these are returned later by sendgrid
    const rawBlockedEmails = sendgridFailures.filter((row) => isBouncedEvent(row.event));
    const uniqRawBlockedEmails = uniqBy(rawBlockedEmails.reverse(), 'email');
    const sendgridBlockedEmails = this.addNameToEmails(uniqRawBlockedEmails, emailsSent);

    const sendgridBlockedEmailsJSON = sendgridBlockedEmails.map((row) =>
      this.buildMetricBody({
        ...row,
        status: row.event,
        reason: row.reason ? row.reason : Antl.formatMessage('bulkMetrics.sendgrid.default'),
      })
    );

    //Invalid events, these happens in our backend (Sendgrid validation cache)
    const invalidEmailsJSON = emailsInvalid.map((row) => {
      const buildInvalidMetricBody = (reason) => {
        return this.buildMetricBody({ ...row, timestamp: row.created_at, status: 'invalid', reason });
      };

      switch (row.type) {
        case SendgridEventTypes.empty:
          return buildInvalidMetricBody(Antl.formatMessage('bulkMetrics.invalid.empty'));

        case SendgridEventTypes.withoutemployer:
          return buildInvalidMetricBody(Antl.formatMessage('bulkMetrics.invalid.withoutemployer'));

        case SendgridEventTypes.withoutcompany:
          return buildInvalidMetricBody(Antl.formatMessage('bulkMetrics.invalid.withoutcompany'));

        case SendgridEventTypes.blockresend:
          return buildInvalidMetricBody(Antl.formatMessage('bulkMetrics.invalid.blockresend'));

        case SendgridEventTypes.failedrecipient:
          return buildInvalidMetricBody(Antl.formatMessage('bulkMetrics.invalid.failedrecipient'));

        case SendgridEventTypes.emailValidation.acceptAll:
          return buildInvalidMetricBody(Antl.formatMessage('bulkMetrics.invalid.emailValidationAcceptAll'));

        case SendgridEventTypes.emailValidation.unknown:
          return buildInvalidMetricBody(Antl.formatMessage('bulkMetrics.invalid.emailValidationUnknown'));

        case SendgridEventTypes.emailValidation.invalid:
          return buildInvalidMetricBody(Antl.formatMessage('bulkMetrics.invalid.emailValidationInvalid'));

        default:
          return buildInvalidMetricBody(Antl.formatMessage('bulkMetrics.invalid.default'));
      }
    });

    const uniqBounced = uniqBy([...blockedEmailsJSON, ...sendgridBlockedEmailsJSON, ...invalidEmailsJSON], 'email');

    return uniqBounced;
  }

  addNameToEmails(namelessEmails, referenceEmails) {
    return namelessEmails.map((row) => {
      const reference = referenceEmails.find((ref) => ref.email === row.email);
      if (reference && reference.full_name) row.full_name = reference.full_name;
      return row;
    });
  }
}

module.exports = BulkEmailMetricBuilder;
