'use strict';

//Repositories
const CompanyRepository = new (use('App/Helpers/CompanyRepository'))();
const UserRepository = new (use('App/Helpers/UserRepository'))();

//Utils
const { notificationTypes, notificationCategories } = use('App/Notifications/Constants');
const { find } = use('lodash');
const Env = use('Env');

class CompanyNotification {
  /**
   *
   * @param {Integer} id
   * @param {String} industry
   * @param {String} specialty
   * @param {String} recruiter
   * @param {String} state
   * @param {String} type
   *
   *
   * @return {Object}
   */
  buildCreationNotifications(notification) {
    const { id, recruiter, type, companyName, companyType, companyTypeReassureId } = notification;

    const options = this.getNotificationOptions(id, type, { companyTypeReassureId });

    const items = {
      OperationsReassured: {
        payload: {
          data: {
            title: `Verify Company Type`,
            body: `${recruiter} has requested to change ${companyName} type to ${companyType}`,
            ...options,
          },
        },
      },
      OperationsReassureUpdated: {
        payload: {
          data: {
            title: `Verify Company Type`,
            body: `${recruiter} updated ${companyName} type request to now be ${companyType}`,
            ...options,
          },
        },
      },
      RecruiterReassureVerified: {
        payload: {
          data: {
            title: `Company Type Request Verified`,
            body: `Your request has been verified, ${companyName} changed its type to ${companyType}`,
            ...options,
          },
        },
      },
      RecruiterReassureVerifiedDifferent: {
        payload: {
          data: {
            title: `Company Type Request Verified`,
            body: `Your request has been verified, ${companyName} changed its type to ${companyType}`,
            ...options,
          },
        },
      },
      RelatedRecruitersReassureVerified: {
        payload: {
          data: {
            title: `Company: ${companyName} is now ${companyType}`,
            body: `Requested by: ${recruiter}`,
            ...options,
          },
        },
      },
    };

    return items;
  }

  /**
   *
   * @param {Integer} id
   * @param {Integer} type
   * @param {Object} args - Any needed args to be passed, E.g.: companyTypeReassureId is needed in a reassurement
   *
   * @return {Object}
   */
  getNotificationOptions(id, type, args) {
    const urlOptions = {
      Company: {
        click_url: `${Env.get('PUBLIC_URL_WEB')}/companies/profile/${id}`,
        click_action: `/companies/profile/${id}`,
      },
      CompanyOpsReassure: {
        click_url: `${Env.get('PUBLIC_URL_WEB')}/companies/profile/${id}?followupid=${
          args.companyTypeReassureId
        }&showopsverificationmodal=true`,
        click_action: `/companies/profile/${id}?followupid=${args.companyTypeReassureId}&showopsverificationmodal=true`,
      },
    };

    const options = [
      //Company Notification Format
      {
        notificationType: notificationTypes.Company.Created,
        format: {
          icon: 'newInventoryItemNotificationIcon',
          color: '#4056F4',
          ...urlOptions.Company,
        },
      },
      {
        notificationType: notificationTypes.Company.StatusUpdated,
        format: {
          icon: 'statusInventoryItemNotificationIcon',
          color: '#4056F4',
          ...urlOptions.Company,
        },
      },
      {
        notificationType: notificationTypes.Company.Reassured,
        format: {
          icon: 'statusInventoryItemNotificationIcon',
          color: '#4056F4',
          ...urlOptions.CompanyOpsReassure,
        },
      },
      {
        notificationType: notificationTypes.Company.PendingReassureUpdated,
        format: {
          icon: 'statusInventoryItemNotificationIcon',
          color: '#4056F4',
          ...urlOptions.CompanyOpsReassure,
        },
      },
      {
        notificationType: notificationTypes.Company.ReassureVerified,
        format: {
          icon: 'statusInventoryItemNotificationIcon',
          color: '#4056F4',
          ...urlOptions.Company,
        },
      },
    ];
    const optionItem = find(options, { notificationType: type });
    if (!optionItem) {
      throw 'NotificationOptionNotFound';
    }
    return {
      ...optionItem.format,
      type: notificationCategories.INVENTORY
    };
  }

  /**
   *
   * @summary Creates an alert when a company has just been reassured, ops is alerted to verify the company type & make changes
   *
   * @param {Number} userId - Who is asking the verification
   * @param {Number} companyId - What company is being modified
   * @param {Number} companyTypeId - To what type the company is expected to change to
   * @param {Number} type - The notification type
   * @param {Number} companyTypeReassureId - The reassure reference
   *
   * @return {Object}
   */
  async getPayloadNotificationOnReassured(userId, companyId, companyTypeId, type, companyTypeReassureId) {
    const company = await CompanyRepository.simpleDetails(companyId);
    const user = await UserRepository.getDetails(userId);
    const companyTypeName = await CompanyRepository.getCompanyTypeDetails(companyTypeId);

    const notificationData = {
      id: companyId,
      companyName: company.name,
      recruiter: user.full_name,
      companyType: companyTypeName.title,
      type,
      companyTypeReassureId,
    };

    const notification = this.buildCreationNotifications(notificationData);

    const operationsTeamUsers = await UserRepository.getOperationsTeamUsers();
    const userIds = operationsTeamUsers.rows.map(({ id }) => id);

    const notifications = [
      {
        userIds,
        payload: notification.OperationsReassured.payload,
      },
    ];

    if (Env.get('SEND_REAL_USERS') !== 'true') {
      notifications[0].userIds = await this.getTestingIds();
    }

    return notifications;
  }

  /**
   *
   * @summary Creates an alert when a company reassure was updated, not created from scratch
   *
   * @param {Number} userId - Who is asking the verification
   * @param {Number} companyId - What company is being modified
   * @param {Number} companyTypeId - To what type the company is expected to change to
   * @param {Number} type - The notification type
   * @param {Number} companyTypeReassureId - The reassure reference
   *
   * @return {Object}
   */
  async getPayloadNotificationOnReassureUpdated(userId, companyId, companyTypeId, type, companyTypeReassureId) {
    const company = await CompanyRepository.simpleDetails(companyId);
    const user = await UserRepository.getDetails(userId);
    const companyTypeName = await CompanyRepository.getCompanyTypeDetails(companyTypeId);

    const notificationData = {
      id: companyId,
      companyName: company.name,
      recruiter: user.full_name,
      companyType: companyTypeName.title,
      type,
      companyTypeReassureId,
    };

    const notification = this.buildCreationNotifications(notificationData);

    const operationsTeamUsers = await UserRepository.getOperationsTeamUsers();
    const userIds = operationsTeamUsers.rows.map(({ id }) => id);

    const notifications = [
      {
        userIds,
        payload: notification.OperationsReassureUpdated.payload,
      },
    ];

    if (Env.get('SEND_REAL_USERS') !== 'true') {
      notifications[0].userIds = await this.getTestingIds();
    }

    return notifications;
  }

  /**
   * @summary Returns the ids of the users for testing purposes
   *
   * @return {Number[]}
   */
  async getTestingIds() {
    const users = await UserRepository.getTestingUsers();
    return users.map((row) => row.id);
  }

  /**
   *
   * @summary Creates an alert that ops checked & verified the recruiter reassure request
   *
   * @param {Number} userId - Who verified the reassure, must be from Ops
   * @param {Number} companyId - What company is being modified
   * @param {Number} companyTypeId - What the company got as a type
   * @param {Number} type - The notification type
   * @param {Number} companyTypeReassureId - The reassure reference
   * @param {Boolean} sameTypeAsRequested - A flag that tell us if Ops chose the same company type as the user requested, if Ops chose a different one, this will be false
   *
   * @return {Object}
   */
  async getPayloadNotificationOnReassureVerified(
    userId,
    companyId,
    companyTypeId,
    type,
    companyTypeReassureId,
    sameTypeAsRequested = true
  ) {
    const company = await CompanyRepository.simpleDetails(companyId);
    const user = await UserRepository.getDetails(userId);
    const companyTypeName = await CompanyRepository.getCompanyTypeDetails(companyTypeId);
    const companyTypeReassure = await CompanyRepository.typeReassureDetails(companyTypeReassureId);

    const notificationData = {
      id: companyId,
      companyName: company.name,
      companyType: companyTypeName.title,
      type,
      recruiter: user.full_name,
    };

    const notification = this.buildCreationNotifications(notificationData);

    const recruiterWhoRequested = companyTypeReassure.user_id; //Who requested the reassure
    const relatedRecruitersToCompany = company.assignedRecruiters.map((row) => row.recruiter_id); //Assigned to the company

    const recruiterWhoRequestedNotification = sameTypeAsRequested
      ? notification.RecruiterReassureVerified
      : notification.RecruiterReassureVerifiedDifferent;

    const notifications = [
      {
        userIds: recruiterWhoRequested,
        payload: recruiterWhoRequestedNotification.payload,
      },
    ];

    if (relatedRecruitersToCompany.length > 0) {
      notifications.push({
        userIds: relatedRecruitersToCompany,
        payload: notification.RelatedRecruitersReassureVerified.payload,
      });
    }

    return notifications;
  }
}

module.exports = CompanyNotification;
