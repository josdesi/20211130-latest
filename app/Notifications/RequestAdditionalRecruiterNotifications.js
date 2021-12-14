'use strict';

//Repositories
const CandidateRepository = new (use('App/Helpers/CandidateRepository'))();
const UserRepository = new (use('App/Helpers/UserRepository'))();
const RecruiterRepository = new (use('App/Helpers/RecruiterRepository'))();
const JobOrderRepository = new (use('App/Helpers/JobOrderRepository'))();

//Utils
const { notificationTypes, notificationCategories } = use('App/Notifications/Constants');
const Env = use('Env');
const { find, compact } = use('lodash');
const { AdditionalRecruiterTypes, userRoles } = use('App/Helpers/Globals');

class RequestAdditionalRecruiterNotifications {
  async getPayloadNotificationRequestRecruiter(
    entityId,
    targetRecruiterId,
    eventUserId,
    notificationType,
    recruiterType
  ) {
    switch (recruiterType) {
      case AdditionalRecruiterTypes.Collaborator:
        return await this.getPayloadNotificationOnRequestCollaboration(
          entityId,
          targetRecruiterId,
          eventUserId,
          notificationType
        );
      case AdditionalRecruiterTypes.Accountable:
        return await this.getPayloadNotificationOnRequestFreeGame(
          entityId,
          targetRecruiterId,
          eventUserId,
          notificationType
        );
    }
  }

  /**
   *
   * @param {Integer} entityId
   * @param {Integer} targetRecruiterId
   * @param {Integer} eventUserId
   * @param {Integer} type
   *
   * @return {Object}
   */
  async getPayloadNotificationOnRequestCollaboration(entityId, targetRecruiterId, eventUserId, type) {
    let inventory = {};

    switch (type) {
      case notificationTypes.Candidate.AdditionalRecruiterRequested:
        inventory = await CandidateRepository.details(entityId, 'compact');
        break;
      case notificationTypes.JobOrder.AdditionalRecruiterRequested:
        inventory = await JobOrderRepository.details(entityId, 'compact');
        break;
    }

    const eventUser = await UserRepository.getDetails(eventUserId);

    const title = inventory.blueSheets ? inventory.personalInformation.full_name : inventory.title;
    const industry = inventory.specialty.industry.title;

    const notificationData = {
      id: entityId,
      recruiter: eventUser.full_name,
      title,
      industry,
      type,
    };

    const notification = this.buildRequestCollaboratorNotification(notificationData);

    const notifications = [
      {
        userIds: targetRecruiterId,
        ...notification.Recruiter,
      },
    ];

    return notifications;
  }

  /**
   *
   * @param {Integer} id
   * @param {String} recruiter
   * @param {String} type
   *
   *
   * @return {Object}
   */
  buildRequestCollaboratorNotification(notification) {
    const { id, recruiter, type, title, industry } = notification;

    const options = this.getNotificationOptions(id, type);

    const items = {
      Recruiter: {
        payload: {
          data: {
            title: `${recruiter} added you as collaborator!`,
            body: `${title} - ${industry}`,
            ...options,
          },
        },
      },
    };

    return items;
  }

  /**
   *
   * @param {Integer} entityId
   * @param {Integer} targetRecruiterId
   * @param {Integer} eventUserId
   * @param {Integer} type
   *
   * @return {Object}
   */
  async getPayloadNotificationOnRequestFreeGame(entityId, targetRecruiterId, eventUserId, type) {
    let inventory = {};

    switch (type) {
      case notificationTypes.Candidate.AdditionalRecruiterRequested:
        inventory = await CandidateRepository.details(entityId, 'compact');
        break;
      case notificationTypes.JobOrder.AdditionalRecruiterRequested:
        inventory = await JobOrderRepository.details(entityId, 'compact');
        break;
    }

    const isCoach = await UserRepository.hasRole(eventUserId, userRoles.Coach);
    const coach = isCoach ? null : await RecruiterRepository.getCoachByRecruiterId(eventUserId);
    const eventUser = await UserRepository.getDetails(eventUserId);

    const targetUser = inventory.recruiter;
    const title = inventory.blueSheets ? inventory.personalInformation.full_name : inventory.title;

    const notificationData = {
      id: entityId,
      requestUser: eventUser,
      currentUserName: targetUser.personalInformation.full_name,
      title,
      type,
      isCoach,
    };

    const notification = this.buildRequestFreeGameNotification(notificationData);

    const notifications = [
      eventUser
        ? {
            userIds: isCoach ? targetRecruiterId : coach,
            ...notification.User,
          }
        : null,
    ];

    return compact(notifications);
  }

  /**
   *
   * @param {Integer} id
   * @param {String} recruiter
   * @param {String} type
   *
   *
   * @return {Object}
   */
  buildRequestFreeGameNotification(notification) {
    const { id, requestUser, currentUserName, type, title, isCoach } = notification;

    const options = this.getNotificationOptions(id, type);
    const messageTarget =
      type === notificationTypes.Candidate.AdditionalRecruiterRequested ? 'Marketing' : 'Recruiting';

    const items = {
      User: {
        payload: {
          data: {
            title: `${requestUser.full_name} ${requestUser.initials ? '(' + requestUser.initials + ')' : ''} ${
              isCoach ? 'added you for' : 'is now'
            } ${messageTarget} ${title}`,
            body: `Current RCR: ${currentUserName}`,
            ...options,
          },
        },
      },
    };

    return items;
  }

  /**
   *
   * @param {Integer} entityId
   * @param {Integer} targetRecruiterId
   * @param {Integer} eventUserId
   * @param {Integer} type
   *
   * @return {Object}
   */
  async getPayloadNotificationOnRemoveRecruiter(
    entityId,
    targetRecruiterId,
    eventUserId,
    notificationType,
    recruiterType
  ) {
    let inventory = {};

    switch (notificationType) {
      case notificationTypes.Candidate.AdditionalRecruiterRemoved:
        inventory = await CandidateRepository.details(entityId, 'compact');
        break;
      case notificationTypes.JobOrder.AdditionalRecruiterRemoved:
        inventory = await JobOrderRepository.details(entityId, 'compact');
        break;
    }

    const eventUser = await UserRepository.getDetails(eventUserId);

    const title = inventory.blueSheets ? inventory.personalInformation.full_name : inventory.title;
    const industry = inventory.specialty.industry.title;

    const notificationData = {
      id: entityId,
      recruiter: eventUser.full_name,
      title,
      industry,
      notificationType,
      recruiterType,
    };

    const notification = this.buildRecruiterRemovedNotification(notificationData);

    const notifications = targetRecruiterId
      ? [
          {
            userIds: targetRecruiterId,
            ...notification.Recruiter,
          },
        ]
      : [];

    return notifications;
  }

  /**
   *
   * @param {Integer} id
   * @param {String} recruiter
   * @param {String} type
   *
   *
   * @return {Object}
   */
  buildRecruiterRemovedNotification(notification) {
    const { id, recruiter, title, industry, notificationType, recruiterType } = notification;

    const options = this.getNotificationOptions(id, notificationType);
    const messageTarget =
      recruiterType === AdditionalRecruiterTypes.Collaborator
        ? 'Collaborating'
        : notificationType === notificationTypes.Candidate.AdditionalRecruiterRequested
        ? 'Marketing'
        : 'Recruiting';

    const items = {
      Recruiter: {
        payload: {
          data: {
            title: `${recruiter} removed you from ${messageTarget}!`,
            body: `${title} - ${industry}`,
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
   *
   * @return {Object}
   */
  getNotificationOptions(id, type) {
    const icon = 'collaborations';
    const urlOptions = {
      Candidate: {
        click_url: `${Env.get('PUBLIC_URL_WEB')}/candidates/profile/${id}`,
        click_action: `/candidates/profile/${id}`,
      },
      JobOrder: {
        click_url: `${Env.get('PUBLIC_URL_WEB')}/joborders/profile/${id}`,
        click_action: `/joborders/profile/${id}`,
      },
    };

    const options = [
      //Candidate Notification Format
      {
        notificationType: notificationTypes.Candidate.AdditionalRecruiterRequested,
        format: {
          icon,
          color: '#4056F4',
          ...urlOptions.Candidate,
        },
      },
      {
        notificationType: notificationTypes.Candidate.AdditionalRecruiterRemoved,
        format: {
          icon,
          color: '#4056F4',
          ...urlOptions.Candidate,
        },
      },
      //Job Order Notification Format
      {
        notificationType: notificationTypes.JobOrder.AdditionalRecruiterRequested,
        format: {
          icon,
          color: '#4056F4',
          ...urlOptions.JobOrder,
        },
      },
      {
        notificationType: notificationTypes.JobOrder.AdditionalRecruiterRemoved,
        format: {
          icon,
          color: '#4056F4',
          ...urlOptions.JobOrder,
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
}

module.exports = RequestAdditionalRecruiterNotifications;
