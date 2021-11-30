'use strict';

//Repositories
const RecruiterRepository = new (use('App/Helpers/RecruiterRepository'))();
const CandidateRepository = new (use('App/Helpers/CandidateRepository'))();
const CompanyRepository = new (use('App/Helpers/CompanyRepository'))();
const JobOrderRepository = new (use('App/Helpers/JobOrderRepository'))();
const UserRepository = new (use('App/Helpers/UserRepository'))();

//Utils
const { notificationTypes, notificationCategories } = use('App/Notifications/Constants');
const { find } = use('lodash');
const Env = use('Env');
const { userRoles, EntityTypes } = use('App/Helpers/Globals');

class InventoryNotifications {
  /**
   *
   * @param {Integer} dataId
   * @param {Integer} type
   *
   * @return {Object}
   */
  async getPayloadNotificationOnCreation(dataId, type) {
    let inventory = {};

    switch (type) {
      case notificationTypes.Candidate.Created:
        inventory = await CandidateRepository.details(dataId, 'compact');
        break;
      case notificationTypes.Company.Created:
        inventory = await CompanyRepository.details(dataId, false);
        break;
      case notificationTypes.JobOrder.Created:
        inventory = await JobOrderRepository.details(dataId, 'compact');
        break;
    }

    const { id, specialty, recruiter } = inventory;

    const state = inventory.personalInformation
      ? inventory.personalInformation.address.city.state.title
      : inventory.address.city.state.title;

    const notificationData = {
      id,
      industry: specialty.industry.title,
      specialty: specialty.title,
      recruiter: recruiter.personalInformation.full_name,
      state,
      type,
    };

    const notification = this.buildCreationNotifications(notificationData);

    const isCoach = await UserRepository.hasRole(recruiter.id,userRoles.Coach)
    const coach =  await RecruiterRepository.getCoachByRecruiterId(recruiter.id);
    const regional = await RecruiterRepository.getRegionalByCoachId(isCoach ? (recruiter.id === coach ? recruiter.id : coach) : coach);
    const recruitersOfCoach = await RecruiterRepository.getRecruitersByCoach(isCoach ? recruiter.id : coach, recruiter.id);
    //const recruitersOfSpecialty = await RecruiterRepository.getRecruitersBySpecialty(isCoach ? recruiter.id : coach, specialty.id);

    const notifications = [];

    regional &&
      notifications.push({
        userIds: regional,
        ...notification.Regional,
      });
    coach &&
      notifications.push({
        userIds: coach,
        ...notification.Coach,
      });
    recruitersOfCoach &&
      notifications.push({
        userIds: recruitersOfCoach,
        ...notification.Team,
      });
    /*recruitersOfSpecialty &&
      notifications.push({
        userIds: recruitersOfSpecialty,
        ...notification.Specialty,
      });*/
    return notifications;
  }

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
    const { id, industry, specialty, recruiter, state, type } = notification;

    const titles = [
      {
        notificationType: notificationTypes.Candidate.Created,
        title: 'Candidate',
      },
      {
        notificationType: notificationTypes.Company.Created,
        title: 'Company',
      },
      {
        notificationType: notificationTypes.JobOrder.Created,
        title: 'Job Order',
      },
    ];
    const entity = find(titles, { notificationType: type }).title || 'Item';

    const options = this.getNotificationOptions(id, type);

    const items = {
      Regional: {
        payload: {
          data: {
            title: `New ${entity} Added by ${recruiter}`,
            body: `${industry}: ${specialty} in ${state}`,
            ...options,
          },
        },
      },
      Coach: {
        payload: {
          data: {
            title: `New ${entity} Added by ${recruiter}`,
            body: `${industry}: ${specialty} in ${state}`,
            ...options,
          },
        },
      },
      Team: {
        payload: {
          data: {
            title: `New ${entity} Added`,
            body: `Added by: ${recruiter} for ${industry}: ${specialty} in ${state}`,
            ...options,
          },
        },
      },
      Specialty: {
        payload: {
          data: {
            title: `New ${entity} Added`,
            body: `Added by: ${recruiter} for ${industry}: ${specialty} in ${state}`,
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
  async getPayloadNotificationOnStatusUpdate(dataId, type, userId) {
    let inventory = {};

    switch (type) {
      case notificationTypes.Candidate.StatusUpdated:
        inventory = await CandidateRepository.details(dataId, 'compact');
        break;
      case notificationTypes.JobOrder.StatusUpdated:
        inventory = await JobOrderRepository.details(dataId, 'compact');
        break;
    }

    const recruiterData = await UserRepository.getDetails(userId);

    const { id, specialty } = inventory;
    const title = inventory.blueSheets ? inventory.personalInformation.full_name : inventory.title;
    const status = inventory.blueSheets
      ? inventory.blueSheets[0].candidateType.title
      : inventory.whiteSheet.jobOrderType.title;

    const notificationData = {
      id,
      title,
      status,
      recruiter: recruiterData.full_name,
      type,
    };

    const notification = this.buildStatusUpdateNotifications(notificationData);

    const isCoach = await UserRepository.hasRole(recruiterData.id,userRoles.Coach)
    const coach =  await RecruiterRepository.getCoachByRecruiterId(recruiterData.id);
    const regional = await RecruiterRepository.getRegionalByCoachId(isCoach ? (recruiterData.id === coach ? recruiterData.id : coach) : coach);
    const recruitersOfCoach = await RecruiterRepository.getRecruitersByCoach(isCoach ? recruiterData.id : coach, recruiterData.id);
    const recruitersOfSpecialty = await RecruiterRepository.getRecruitersBySpecialty(isCoach ? recruiterData.id : coach, specialty.id);

    const notifications = [];

    regional &&
      notifications.push({
        userIds: regional,
        ...notification.Regional,
      });
    coach &&
      notifications.push({
        userIds: coach,
        ...notification.Coach,
      });
    recruitersOfCoach &&
      notifications.push({
        userIds: recruitersOfCoach,
        ...notification.Team,
      });
    recruitersOfSpecialty &&
      notifications.push({
        userIds: recruitersOfSpecialty,
        ...notification.Specialty,
      });

    return notifications;
  }


  /**
   *
   * @param {Integer} id
   * @param {String} item
   * @param {String} status
   * @param {String} recruiter
   * @param {String} type
   *
   *
   * @return {Object}
   */
  buildStatusUpdateNotifications(notification) {
    const { id, title, status, recruiter, type } = notification;

    const titles = [
      {
        notificationType: notificationTypes.Candidate.StatusUpdated,
        title: 'Candidate',
      },
      {
        notificationType: notificationTypes.JobOrder.StatusUpdated,
        title: 'Job Order',
      },
    ];
    const entity = find(titles, { notificationType: type }).title || 'Item';

    const options = this.getNotificationOptions(id, type);

    const items = {
      Regional: {
        payload: {
          data: {
            title: `${recruiter} Changed ${title} Status`,
            body: `New Status: ${status}`,
            ...options,
          },
        },
      },
      Coach: {
        payload: {
          data: {
            title: `${recruiter} Changed ${title} Status`,
            body: `New Status: ${status}`,
            ...options,
          },
        },
      },
      Team: {
        payload: {
          data: {
            title: `${entity}: ${title} is now ${status}`,
            body: `Changed by: ${recruiter}`,
            ...options,
          },
        },
      },
      Specialty: {
        payload: {
          data: {
            title: `${entity}: ${title} is now ${status}`,
            body: `Changed by: ${recruiter}`,
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
  async getPayloadNotificationOnRecruiterAssigned(
    entityType,
    entityId,
    targetRecruiterId,
    eventUserId,
    type
  ) {
    let inventory = {};

    switch (entityType) {
      case EntityTypes.Candidate:
        inventory = await CandidateRepository.details(entityId, 'compact');
        break;
      case EntityTypes.JobOrder:
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
      entityType,
      type
    };

    const notification = this.buildRecruiterAssignedNotification(notificationData);

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
  buildRecruiterAssignedNotification(notification) {
    const { id, recruiter, title, industry, entityType, type }  = notification;

    const options = this.getNotificationOptions(id, type);
    const messageTarget = entityType === EntityTypes.Candidate
        ? 'Market'
        : 'Recruit';

    const items = {
      Recruiter: {
        payload: {
          data: {
            title: `${recruiter} has assigned you to ${messageTarget}`,
            body: `${title} - ${industry}`,
            ...options,
          },
        },
      },
    };

    return items;
  }

  async getPayloadNotificationOnOfficeAssignation(previousUserId, coachTeamId) {
    const notifications = [];
    const teamResult = await UserRepository.findOrCreateTeamCoach({ userId : coachTeamId });
    if(!teamResult.success){
      throw new Error(teamResult.error);
    }
    const { office_user_id } = teamResult.data;
    const previousUser = await UserRepository.getDetails(previousUserId);
    const officeUser = await UserRepository.getDetails(office_user_id);
    const targetUser = await UserRepository.getDetails(coachTeamId);

    const notificationData = {
      previousUserName: previousUser.full_name ? previousUser.full_name : '',
      officeUserName: officeUser.full_name ? officeUser.full_name : '',
      type: notificationTypes.Inventory.MovedToOffice
    };

    const notification = this.buildOfficeAssignationNotification(notificationData);

    targetUser && notifications.push({
      userIds: [coachTeamId],
      ...notification.User,
    })

    return notifications;
  }


      /**
   *
   * @param {Object|User} previousUserName
   * @param {Object|User} officeUserName
   *
   *
   * @return {Object}
  */
  buildOfficeAssignationNotification(notification) {
    const { previousUserName, officeUserName, type }  = notification;

    const options = this.getNotificationOptions(null, type);

    const items = {
      User: {
        payload: {
          data: {
            title: `${previousUserName}'s items have been assigned to your office.`,
            body: `${officeUserName}`,
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
    const urlOptions = {
      Candidate: {
        click_url: `${Env.get('PUBLIC_URL_WEB')}/candidates/profile/${id}`,
        click_action: `/candidates/profile/${id}`,
      },
      Company: {
        click_url: `${Env.get('PUBLIC_URL_WEB')}/companies/profile/${id}`,
        click_action: `/companies/profile/${id}`,
      },
      JobOrder: {
        click_url: `${Env.get('PUBLIC_URL_WEB')}/joborders/profile/${id}`,
        click_action: `/joborders/profile/${id}`,
      },
    };

    const options = [
      //Candidate Notification Format
      {
        notificationType: notificationTypes.Candidate.Created,
        format: {
          icon: 'newInventoryItemNotificationIcon',
          color: '#4056F4',
          ...urlOptions.Candidate,
        },
      },
      {
        notificationType: notificationTypes.Candidate.StatusUpdated,
        format: {
          icon: 'statusInventoryItemNotificationIcon',
          color: '#4056F4',
          ...urlOptions.Candidate,
        },
      },
      {
        notificationType: notificationTypes.Candidate.RecruiterAssigned,
        format: {
          icon: 'collaborations',
          color: '#4056F4',
          ...urlOptions.Candidate,
        },
      },
      //Job Order Notification Format
      {
        notificationType: notificationTypes.JobOrder.Created,
        format: {
          icon: 'newInventoryItemNotificationIcon',
          color: '#4056F4',
          ...urlOptions.JobOrder,
        },
      },
      {
        notificationType: notificationTypes.JobOrder.StatusUpdated,
        format: {
          icon: 'statusInventoryItemNotificationIcon',
          color: '#4056F4',
          ...urlOptions.JobOrder,
        },
      },
      {
        notificationType: notificationTypes.JobOrder.RecruiterAssigned,
        format: {
          icon: 'collaborations',
          color: '#4056F4',
          ...urlOptions.JobOrder,
        },
      },
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
      //Office Assignation Format
      {
        notificationType: notificationTypes.Inventory.MovedToOffice,
        format: {
          icon: 'collaborations',
          color: '#4056F4',
          click_url: '',
          click_action: ''
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

module.exports = InventoryNotifications;
