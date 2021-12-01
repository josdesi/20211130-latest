'use strict'
const appInsights = require('applicationinsights');
const FeeAgreementNotification = new (use('App/Notifications/FeeAgreementNotification'))();
const NotificationService = use('Services/Notification');
const FeeAgreementEmails = new (use('App/Emails/FeeAgreementEmails'))();
const  { NotificationTargetDeviceType } = use('App/Helpers/Globals'); 
const FeeAgreementRepository = new (use('App/Helpers/FeeAgreementRepository'))(); 
const InstantMessagingService = new (use('App/Services/InstantMessagingService'))();

const CompanyFeeAgreementModel = use('App/Models/CompanyFeeAgreement');

const moment = require('moment');

const makeNotificationsFromPayloads = (payloads) => {
  return Object.keys(payloads).map(key => (payloads[key] ? {
    ...payloads[key],
    targetDevicesTypes: NotificationTargetDeviceType.All
  } : null)).filter(notification => !!notification);
}

async function getFeeAgreementWithDetails(id) {
  const feeAgreement = await CompanyFeeAgreementModel.find(id);
  if (!feeAgreement) return null;
  await FeeAgreementRepository.loadRelations(feeAgreement);
  return feeAgreement;
}

function getGenericNotifier({buildPayloads, sendNotification = NotificationService.sendMultiDeviceNotificationToUsers.bind(NotificationService), additionalWorkFunctions}) {
  if (!(buildPayloads instanceof Function) || !(sendNotification instanceof Function)) {
    throw new Error('buildPayloads, and sendNotifications must be functions');
  }
  return (async function({feeAgreement}) {
    try {
      const payloads = await buildPayloads(feeAgreement);
      const notifications = makeNotificationsFromPayloads(payloads);
      const promises = notifications.map(sendNotification);
      await Promise.all(promises);
      if (Array.isArray(additionalWorkFunctions)) {
        const fullFeeAgreement = await getFeeAgreementWithDetails(feeAgreement.id);
        if (!fullFeeAgreement) throw new Error('Could not get full fee agreement');
        for(const makeAdditionalWork of additionalWorkFunctions) {
          if (makeAdditionalWork instanceof Function) {
            try {

              await makeAdditionalWork({feeAgreement: fullFeeAgreement, payloads, notifications});

            } catch(error) {
              appInsights.defaultClient.trackException({ exception: error });
            }
          }
        }
      }
    } catch(error) {
      appInsights.defaultClient.trackException({ exception: error });
    }
  });
}

async function sendRegionalDirectorEmail({feeAgreement}) {
  await FeeAgreementEmails.sendRegionalDirectorEmail(feeAgreement);
}

async function sendHiringAuthorityThankEmail({feeAgreement}) {
  await FeeAgreementEmails.sendHiringAuthorityThankEmail(feeAgreement);
}

async function sendSignedEmailToSendouts({feeAgreement}) {
  return FeeAgreementEmails.sendSignedEmailToSendouts(feeAgreement);
}

async function sendValidationEmails({payloads}) {
  const notifications = makeNotificationsFromPayloads({...payloads, operationsTeam: null});
  const promises = notifications.flatMap(notification => {
    if(notification === null || notification === undefined) return []

    return FeeAgreementEmails.sendValidationEmail(notification)
  });
  return await Promise.all(promises);
}

async function sendInstantMessage({ feeAgreement }) {
  const configKeys = ['coachesGlipConfig', 'gpacAllGlipConfig'];

  const totalForTrackingDay = await FeeAgreementRepository.getDailySignedTotalForTracking();

  if (!totalForTrackingDay) return;
 
  const agreementAsJson = feeAgreement.toJSON();
  if (!agreementAsJson.creator || !agreementAsJson.company || !agreementAsJson.company.specialty) return;

  const title = `${totalForTrackingDay} signed ${agreementAsJson.creator.personalInformation.full_name} -${agreementAsJson.company.specialty.industry.title}`;
  return await InstantMessagingService.sendMessage({ configKeys, title, text: null });
}

const CompanyFeeAgreement = {

  notifyStandardCreation: getGenericNotifier({
    buildPayloads: FeeAgreementNotification.getCreatedAndSentToSignNotifications.bind(FeeAgreementNotification),
    additionalWorkFunctions: [
      sendRegionalDirectorEmail,
      sendHiringAuthorityThankEmail
    ]
  }),

  notifyNonstandardCreation: getGenericNotifier({
    buildPayloads: FeeAgreementNotification.getValidationRequestedNotifications.bind(FeeAgreementNotification),
    additionalWorkFunctions: [sendValidationEmails]
  }),

  notifyNonstandardCreationByCoach: getGenericNotifier({
    buildPayloads: FeeAgreementNotification.getValidationRequestedByCoachNotifications.bind(FeeAgreementNotification),
    additionalWorkFunctions: [sendValidationEmails]
  }),

  notifySignedByHiringAuthority: getGenericNotifier({
    buildPayloads: FeeAgreementNotification.getSignedByHiringAuthorityNotifications.bind(FeeAgreementNotification),
  }),

  notifySignedByProductionDirector: getGenericNotifier({
    buildPayloads: FeeAgreementNotification.getSignedByProductionDirectorNotifications.bind(FeeAgreementNotification),
    additionalWorkFunctions: [sendSignedEmailToSendouts, sendInstantMessage]
  }),

  notifyValidatedByCoach: getGenericNotifier({
    buildPayloads: FeeAgreementNotification.getValidatedByCoachNotifications.bind(FeeAgreementNotification),
  }),

  notifyValidatedByOperationsAndSentToSign: getGenericNotifier({
    buildPayloads: FeeAgreementNotification.getValidatedByOperationsAndSentToSignNotifications.bind(FeeAgreementNotification),
    additionalWorkFunctions: [
      sendHiringAuthorityThankEmail
    ]
  }),

  notifyValidatedByCoachAndSentToSign: getGenericNotifier({
    buildPayloads: FeeAgreementNotification.getValidatedByCoachAndSentToSignNotifications.bind(FeeAgreementNotification),
  }),

  notifyDeclinedByOperations: getGenericNotifier({
    buildPayloads: FeeAgreementNotification.getDeclinedByOperationsNotifications.bind(FeeAgreementNotification),
  }),

  notifyDeclinedByCoach: getGenericNotifier({
    buildPayloads: FeeAgreementNotification.getDeclinedByCoachNotifications.bind(FeeAgreementNotification),
  }),

  notifySentToCoachValidation: getGenericNotifier({
    buildPayloads: FeeAgreementNotification.getSentToCoachValidationNotifications.bind(FeeAgreementNotification),
  }),

  notifySentToCoachValidation:  getGenericNotifier({
    buildPayloads: FeeAgreementNotification.getSentToOperationsValidationNotifications.bind(FeeAgreementNotification),
  }),

  notifySentToOperationsValidation: getGenericNotifier({
    buildPayloads: FeeAgreementNotification.getSentToOperationsValidationNotifications.bind(FeeAgreementNotification),
  }),

  notifySignatureReminderSent: getGenericNotifier({
    buildPayloads: FeeAgreementNotification.getSignatureReminderSentNotifications.bind(FeeAgreementNotification),
  }),

  notifySignatureRequestEmailBounced: getGenericNotifier({
    buildPayloads: FeeAgreementNotification.getSignatureRequestEmailBouncedNotifications.bind(FeeAgreementNotification),
  }),

  notifyVoided: getGenericNotifier({
    buildPayloads: FeeAgreementNotification.getVoidedNotifications.bind(FeeAgreementNotification),
  }),

  notifyExpired: getGenericNotifier({
    buildPayloads: FeeAgreementNotification.getExpiredNotifications.bind(FeeAgreementNotification),
  }),

  notifyAboutExpire: async({feeAgreement, daysLeft}) => {
    try {
      const payloads = await FeeAgreementNotification.getAboutExpireNotifications(feeAgreement, daysLeft);
      const notifications = Object.keys(payloads).map(key => payloads[key]);
      const promises = notifications.map(notification => {
        return NotificationService.sendNotificationToUsers(notification)
      });
      await Promise.all(promises);
    } catch(error) {
      appInsights.defaultClient.trackException({ exception: error });
    }
  },

  notifyCreatedUnmanagedByOperations: async function ({feeAgreement}) {
    const notififer = getGenericNotifier({
      buildPayloads: FeeAgreementNotification.getSignedByProductionDirectorNotifications.bind(FeeAgreementNotification),
      additionalWorkFunctions: [sendSignedEmailToSendouts, sendInstantMessage]
    });

    if (moment(feeAgreement.signed_date).diff(moment.now(), 'days') == 0) {
      return notififer({feeAgreement});
    }
  }
}


module.exports = CompanyFeeAgreement;
