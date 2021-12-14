'use strict';

//Repositories
const CandidateRepository = new (use('App/Helpers/CandidateRepository'))();
const JobOrderRepository = new (use('App/Helpers/JobOrderRepository'))();
const RecruiterRepository = new (use('App/Helpers/RecruiterRepository'))();
const UserRepository = new (use('App/Helpers/UserRepository'))();


//Utils
const { notificationTypes, notificationCategories } = use('App/Notifications/Constants');
const { find, compact } = use('lodash');
const Env = use('Env');
const { userRoles } = use('App/Helpers/Globals');

/**
 * @deprecated  
 */
class OperatingNotifications {
  /**
   *
   * @param {Integer} dataId
   * @param {Integer} type
   *
   * @return {Object}
   */
  async getPayloadNotificationBeforeRenew(dataId, type, userId) {
    let inventory = {};

    switch (type) {
      case notificationTypes.Candidate.BeforeOperatingRenew:
        inventory = await CandidateRepository.details(dataId, 'compact');
        break;
      case notificationTypes.JobOrder.BeforeOperatingRenew:
        inventory = await JobOrderRepository.details(dataId, 'compact');
        break;
    }

    const { id } = inventory;

    const title = inventory.blueSheets ? inventory.personalInformation.full_name : inventory.title;

    const notificationData = {
      id,
      title,
      type,
    };

    const notification = this.buildFirstMetricNotification(notificationData);

    const recruiter = Number.isFinite(userId) ? userId : (inventory.recruiter ? inventory.recruiter.id : inventory.recruiter_id);

    return recruiter
      ? {
          userIds: recruiter,
          ...notification,
        }
      : [];
  }

  /**
   *
   * @param {Integer} id
   * @param {String} title
   * @param {String} type
   *
   *
   * @return {Object}
   */
  buildFirstMetricNotification(notification) {
    const { id, title, type } = notification;

    const titles = [
      {
        notificationType: notificationTypes.Candidate.BeforeOperatingRenew,
        title: 'Candidate',
      },
      {
        notificationType: notificationTypes.JobOrder.BeforeOperatingRenew,
        title: 'Job Order',
      },
    ];
    const entity = find(titles, { notificationType: type }).title || 'Item';

    const options = this.getNotificationOptions(id, type);

    const notificatiopayload = {
      payload: {
        data: {
          title: `${title} is an urgent ${entity}`,
          body: `It's time to take all the shots now`,
          ...options,
        },
      },
    };

    return notificatiopayload;
  }

  /**
   *
   * @param {Integer} dataId
   * @param {Integer} type
   *
   * @return {Object}
   */
  async getPayloadNotificationOnOperatingCompleted(dataId, type, userId){
    let inventory = {};

    switch (type) {
      case notificationTypes.Candidate.OperatingMetricCompleted:
        inventory = await CandidateRepository.details(dataId, 'compact');
        break;
      case notificationTypes.JobOrder.OperatingMetricCompleted:
        inventory = await JobOrderRepository.details(dataId, 'compact');
        break;
    }

    const recruiterData = await UserRepository.getDetails(userId);

    const { id } = inventory;

    const title = inventory.blueSheets ? inventory.personalInformation.full_name : inventory.title;

    const notificationData = {
      id,
      title,
      type,
      recruiter: recruiterData.full_name,
    };

    const notification = this.buildCompletedMetricNotification(notificationData);

    const coach = await RecruiterRepository.getCoachByRecruiterId(recruiterData.id);

    const notifications = [
      recruiterData.id
        ? {
            userIds: recruiterData.id,
            ...notification.Recruiter,
          }
        : null,
      coach
        ? {
            userIds: coach,
            ...notification.Coach,
          }
        : null,
    ];

    return compact(notifications);
  }

  /**
   *
   * @param {Integer} id
   * @param {String} title
   * @param {String} recruiter
   * @param {String} type
   *
   *
   * @return {Object}
   */
  buildCompletedMetricNotification(notification) {
    const { id, title, type, recruiter } = notification;

    const titles = [
      {
        notificationType: notificationTypes.Candidate.OperatingMetricCompleted,
        title: 'Candidate',
      },
      {
        notificationType: notificationTypes.JobOrder.OperatingMetricCompleted,
        title: 'Job Order',
      },
    ];
    const entity = find(titles, { notificationType: type }).title || 'Item';

    const options = this.getNotificationOptions(id, type);

    const items = {
      Recruiter: {
        payload: {
          data: {
            title: `You've Taken All the Shots with the ${entity}: ${title}`,
            body: `Next Step: A Sendout`,
            ...options,
          },
        },
      },
      Coach: {
        payload: {
          data: {
            title: `${recruiter} Has Taken All the Shots on ${entity}: ${title}`,
            body: `Next Step: A Sendout`,
            ...options,
          },
        },
      },
    };

    return items;
  }

  /**
   *
   * @param {Integer} dataId
   * @param {Integer} type
   *
   * @return {Object}
   */
  async getPayloadNotificationOnMetricReminder(dataId, type, userId) {
    let inventory = {};

    switch (type) {
      case notificationTypes.Candidate.OperatingMetricReminder:
        inventory = await CandidateRepository.details(dataId, 'compact');
        break;
      case notificationTypes.JobOrder.OperatingMetricReminder:
        inventory = await JobOrderRepository.details(dataId, 'compact');
        break;
    }

    const recruiterData = await UserRepository.getDetails(userId);

    const { id } = inventory;

    const title = inventory.blueSheets ? inventory.personalInformation.full_name : inventory.title;

    const notificationData = {
      id,
      title,
      type,
      recruiter: recruiterData.full_name,
    };
    const notification = this.buildMetricReminderNotification(notificationData);
    const isCoach = await UserRepository.hasRole(recruiterData.id,userRoles.Coach)
    const coach =  await RecruiterRepository.getCoachByRecruiterId(recruiterData.id);
    const regional = await RecruiterRepository.getRegionalByCoachId(isCoach ? (recruiterData.id === coach ? recruiterData.id : coach)  : coach);

    const notifications = [
      recruiterData.id
        ? {
            userIds: recruiterData.id,
            ...notification.Recruiter,
          }
        : null,
      coach
        ? {
            userIds: coach,
            ...notification.Coach,
          }
        : null,
      regional
        ? {
            userIds: regional,
            ...notification.Coach,
          }
        : null,
    ];

    return compact(notifications);
  }

  /**
   *
   * @param {Integer} id
   * @param {String} title
   * @param {String} recruiter
   * @param {String} type
   *
   *
   * @return {Object}
   */
  buildMetricReminderNotification(notification) {
    const { id, title, type, recruiter } = notification;

    const titles = [
      {
        notificationType: notificationTypes.Candidate.OperatingMetricReminder,
        title: 'Candidate',
      },
      {
        notificationType: notificationTypes.JobOrder.OperatingMetricReminder,
        title: 'Job Order',
      },
    ];
    const entity = find(titles, { notificationType: type }).title || 'Item';

    const options = this.getNotificationOptions(id, type);

    const items = {
      Recruiter: {
        payload: {
          data: {
            title: `Activities Pending to Take All the Shots.`,
            body: `Check out the activities missing for ${entity}: ${title}`,
            ...options,
          },
        },
      },
      Coach: {
        payload: {
          data: {
            title: `Activities Pending from ${recruiter}.`,
            body: `${recruiter} is missing some activities to take all the shots`,
            ...options,
          },
        },
      },
    };

    return items;
  }

  /**
   *
   * @param {Integer} operatingMetric
   * @param {Integer} type
   *
   * @return {Object}
   */
  async getPayloadNotificationOnMetricRenewed(operatingMetric, type, userId) {
    let inventory = {};

    switch (type) {
      case notificationTypes.Candidate.OperatingMetricRenewed:
        inventory = await CandidateRepository.details(operatingMetric.candidate_id, 'compact');
        break;
      case notificationTypes.JobOrder.OperatingMetricRenewed:
        inventory = await JobOrderRepository.details(operatingMetric.job_order_id, 'compact');
        break;
    }

    const recruiterData = await UserRepository.getDetails(userId);
    const { id } = inventory;

    const title = inventory.blueSheets ? inventory.personalInformation.full_name : inventory.title;

    const notificationData = {
      id,
      title,
      type,
      perecentage: operatingMetric.percentage,
      recruiter: recruiterData.full_name,
    };

    const notification = this.buildMetricRenewedNotification(notificationData);

    const isCoach = await UserRepository.hasRole(recruiterData.id,userRoles.Coach)
    const coach =  await RecruiterRepository.getCoachByRecruiterId(recruiterData.id);
    const regional = await RecruiterRepository.getRegionalByCoachId(isCoach ? (recruiterData.id === coach ? recruiterData.id : coach) : coach);

    const notifications = [
      recruiterData.id
        ? {
            userIds: recruiterData.id,
            ...notification.Recruiter,
          }
        : null,
      coach
        ? {
            userIds: coach,
            ...notification.Coach,
          }
        : null,
      regional
        ? {
            userIds: regional,
            ...notification.Coach,
          }
        : null,
    ];

    return compact(notifications);
  }


  /**
   *
   * @param {Integer} id
   * @param {String} title
   * @param {String} recruiter
   * @param {String} type
   * @param {Integer} perecentage
   *
   *
   * @return {Object}
   */
  buildMetricRenewedNotification(notification) {
    const { id, title, type, recruiter, perecentage } = notification;

    const titles = [
      {
        notificationType: notificationTypes.Candidate.OperatingMetricRenewed,
        title: 'Candidate',
      },
      {
        notificationType: notificationTypes.JobOrder.OperatingMetricRenewed,
        title: 'Job Order',
      },
    ];
    const entity = find(titles, { notificationType: type }).title || 'Item';

    const options = this.getNotificationOptions(id, type);

    const items = {
      Recruiter: {
        payload: {
          data: {
            title: `${entity}: ${title} Finished at ${perecentage}%`,
            body: `Start today again to take all the shots`,
            ...options,
          },
        },
      },
      Coach: {
        payload: {
          data: {
            title: `${recruiter} ${entity}: ${title} Finished at ${perecentage}%`,
            body: `Start today again to take all the shots`,
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
    const icon = 'operating10'
    const urlOptions = {
      Candidate: {
        click_url: `${Env.get('PUBLIC_URL_WEB')}/candidates/profile/${id}?tab=metrics`,
        click_action: `/candidates/profile/${id}?tab=metrics`,
      },
      JobOrder: {
        click_url: `${Env.get('PUBLIC_URL_WEB')}/joborders/profile/${id}?tab=metrics`,
        click_action: `/joborders/profile/${id}?tab=metrics`,
      },
    };

    const options = [
      //Candidate Notification Format
      {
        notificationType: notificationTypes.Candidate.BeforeOperatingRenew,
        format: {
          icon,
          color: '#4056F4',
          ...urlOptions.Candidate,
        },
      },
      {
        notificationType: notificationTypes.Candidate.OperatingMetricCompleted,
        format: {
          icon,
          color: '#4056F4',
          ...urlOptions.Candidate,
        },
      },
      {
        notificationType: notificationTypes.Candidate.OperatingMetricReminder,
        format: {
          icon,
          color: '#4056F4',
          ...urlOptions.Candidate,
        },
      },
      {
        notificationType: notificationTypes.Candidate.OperatingMetricRenewed,
        format: {
          icon,
          color: '#4056F4',
          ...urlOptions.Candidate,
        },
      },
      //Job Order Notification Format
      {
        notificationType: notificationTypes.JobOrder.BeforeOperatingRenew,
        format: {
          icon,
          color: '#4056F4',
          ...urlOptions.JobOrder,
        },
      },
      {
        notificationType: notificationTypes.JobOrder.OperatingMetricCompleted,
        format: {
          icon,
          color: '#4056F4',
          ...urlOptions.JobOrder,
        },
      },
      {
        notificationType: notificationTypes.JobOrder.OperatingMetricReminder,
        format: {
          icon,
          color: '#4056F4',
          ...urlOptions.JobOrder,
        },
      },
      {
        notificationType: notificationTypes.JobOrder.OperatingMetricRenewed,
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
      type: notificationCategories.OPERATING_METRICS
    }
  }
}

module.exports = OperatingNotifications;
