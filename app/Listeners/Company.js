'use strict';

//Utils
const appInsights = require('applicationinsights');
const { notificationTypes } = use('App/Notifications/Constants');
const NotificationService = use('Services/Notification');
const CompanyReassureEmail = new (use('App/Emails/CompanyReassureEmail'))();
const HiringAuthorityDirectoryUpdater = new (use('App/Helpers/HiringAuthorityDirectoryUpdater'))();
const CandidateDirectoryUpdater = new (use('App/Helpers/CandidateDirectoryUpdater'))();
const NameDirectoryUpdater = new (use('App/Helpers/NameDirectoryUpdater'))();
//Repositories
const InventoryNotification = new (use('App/Notifications/InventoryNotifications'))();
const CompanyNotification = new (use('App/Notifications/CompanyNotification'))();
const CompanyRepository = new (use('App/Helpers/CompanyRepository'))();
const Company = {
  notifyOnCreation: async ({company}) => {
    try {
      const notifications = await InventoryNotification.getPayloadNotificationOnCreation(company.id, notificationTypes.Company.Created);

      notifications.map(async (notification) => {
        await NotificationService.sendNotificationToUsers(notification);
      });
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
    }
  },
  /**
   *
   * @summary Sends an alerts to ops that a company was just reassured
   *
   * @param {Number} userId - Who did the changes/reassure, usually a recruiter/coach
   * @param {Number} companyId - What company was updated
   * @param {Number} companyTypeId - To what type the company was changed to
   * @param {Number} companyTypeReassureId - The reference of the reassure, helpful to end the process the recruiter started
   *
   * @return {Object}
   */
  notifyReassured: async ({ userId, companyId, companyTypeId, companyTypeReassureId }) => {
    try {
      const notifications = await CompanyNotification.getPayloadNotificationOnReassured(
        userId,
        companyId,
        companyTypeId,
        notificationTypes.Company.Reassured,
        companyTypeReassureId
      );
      notifications.map(async (notification) => {
        await NotificationService.sendNotificationToUsers(notification);
      });
      await CompanyReassureEmail.sendReassureOpsNotification(
        notifications[0],
        userId,
        companyId,
        companyTypeId,
        companyTypeReassureId
      );
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
    }
  },
  /**
   *
   * @summary Sends an alerts to ops that a pending company reassure was updated
   *
   * @param {Number} userId - Who did the update, usually a recruiter/coach & the one who created the reassure
   * @param {Number} companyId - What company was updated
   * @param {Number} companyTypeId - To what type the company was changed to
   * @param {Number} companyTypeReassureId - The reference of the reassure, helpful to end the process the recruiter started
   *
   * @return {Object}
   */
  notifyPendingReassureUpdated: async ({ userId, companyId, companyTypeId, companyTypeReassureId }) => {
    try {
      const notifications = await CompanyNotification.getPayloadNotificationOnReassureUpdated(
        userId,
        companyId,
        companyTypeId,
        notificationTypes.Company.PendingReassureUpdated,
        companyTypeReassureId
      );
      notifications.map(async (notification) => {
        await NotificationService.sendNotificationToUsers(notification);
      });
      await CompanyReassureEmail.sendReassureOpsNotification(
        notifications[0],
        userId,
        companyId,
        companyTypeId,
        companyTypeReassureId
      );
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
    }
  },
  /**
   * @summary Sends an alerts to the recruiter that requested the reassure (verified from ops)
   *
   * @param {Number} userId - Who did the changes/verification, must be from Ops team
   * @param {Number} companyId - What company was updated
   * @param {Number} companyTypeId - To what type the company was changed to
   * @param {Number} companyTypeReassureId - The reference of the reassure, helpful to get the reassure info & finish it in this process
   * @param {Boolean} sameTypeAsRequested - A flag that tell us if Ops chose the same company type as the user requested, if Ops chose a different one, this will be false
   *
   * @return {Object}
   */
  notifyReassureVerified: async ({ userId, companyId, companyTypeId, companyTypeReassureId, sameTypeAsRequested }) => {
    try {
      const notifications = await CompanyNotification.getPayloadNotificationOnReassureVerified(
        userId,
        companyId,
        companyTypeId,
        notificationTypes.Company.ReassureVerified,
        companyTypeReassureId,
        sameTypeAsRequested
      );
      notifications.map(async (notification) => {
        await NotificationService.sendNotificationToUsers(notification);
      });
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
    }
  },
  /**
   * Log a company change
   *
   * @description Use this whenver a change is made to a company & is deemed important to record in the audit trail
   *
   * @param {Number} companyId - The company that suffered the change
   * @param {String} entity - What changed in the company (type, ..., etc)
   * @param {String} operation - Related operation (create, update, delete)
   * @param {Object} payload - Content of the changed object
   * @param {Number} userId - Who made the change
   *
   */
  logChange: async ({companyId, entity, operation, payload, userId}) => {
    try {
      await CompanyRepository.logChange(companyId, entity, operation, payload, userId);
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
    }
  },
  
  updateHiringAuthoritiesDirectoryInformation: async({companyId}) => {
    try {
      await HiringAuthorityDirectoryUpdater.refreshByForeignKey('company_id', companyId);
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
    }
  },

  updateCandidatesDirectoryInformation: async({companyId}) => {
    try {
      await CandidateDirectoryUpdater.refreshByForeignKey('company_id', companyId);
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
    }
  },

  updateNamesDirectoryInformation: async({companyId}) => {
    try {
      await NameDirectoryUpdater.refreshByForeignKey('company_id', companyId);
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
    }
  },

  updateSearchableText: async({companyId}) => {
    try {
      await CompanyRepository.updateSearchableText({companyId})
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
    }
  },

  onFeeAgreementSigned: async ({companyId, feeAgreementId}) => {
    try {
      await CompanyRepository.handleOnFeeAgreementSigned(companyId, feeAgreementId);
      await HiringAuthorityDirectoryUpdater.refreshByForeignKey('company_id', companyId);
      await CandidateDirectoryUpdater.refreshByForeignKey('company_id', companyId);
      await NameDirectoryUpdater.refreshByForeignKey('company_id', companyId);
    } catch(error) { 
      appInsights.defaultClient.trackException({ exception: error });
    }
  }
};

module.exports = Company;
