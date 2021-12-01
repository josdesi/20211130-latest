'use strict';

//Repositories
const RecruiterRepository = new (use('App/Helpers/RecruiterRepository'))();
const UserRepository = new (use('App/Helpers/UserRepository'))();

//Utils
const { notificationTypes, notificationCategories } = use('App/Notifications/Constants');
const { find } = use('lodash');
const Env = use('Env');
const { userRoles } = use('App/Helpers/Globals');
const Antl = use('Antl');

//Models
const PlacementSuggestedUpdate = use('App/Models/PlacementSuggestedUpdate');

class PlacementNotification {
  /**
   *
   * @param {Object} placement
   * @param {Integer} type
   *
   * @return {Object}
   */
  async getPayloadNotificationOnCreation(placement, type) {
    const {
      created_by: userId,
      id: placement_id
    } = placement;
    const isCoach = await UserRepository.hasRole(userId,userRoles.Coach);
    if(isCoach){
      return;
    }
    const { coach_id } =  await UserRepository.getCoachAndRegionalDirector(userId);
    const user = await UserRepository.getDetails(userId);
    const notificationData = {
      id: placement_id,
      recruiter: user.full_name,
      type,
      placement_id
    };
    const notification = this.buildCreationNotifications(notificationData);
  
    const notifications = [];
    notifications.push({
      userIds: [coach_id],
      ...notification.Coach,
    });
    return notifications;
  }

  /**
   *
   * @param {Integer} id
   * @param {String} recruiter
   * @param {String} type
   * @param {Integer} placement_id
   *
   * @return {Object}
   */
  buildCreationNotifications(notification) {
    const { id, recruiter, type } = notification;

    const options = this.getNotificationOptions(id, type, {});

    const items = {
      Coach: {
        payload: {
          data: {
            title: Antl.formatMessage('notifications.placement.creation.coach.title', { recruiterName: recruiter }),
            body: Antl.formatMessage('notifications.placement.creation.coach.body'),
            ...options,
          },
        },
      },
    };

    return items;
  }

 /**
   *
   * @param {Object} placement
   * @param {Integer} type
   *
   * @return {Object}
   */
  async getPayloadNotificationOnSuggestionUpdate(placement, placementUpdate, type) {
    const {
      created_by: userId,
      id: placement_id
    } = placement;
    const { user_id : updateUserId = null } = placementUpdate;
    const user = await UserRepository.getDetails(updateUserId);

    const notificationData = {
      id: placement_id,
      type,
      userName: user.full_name
    };
    const notification = this.buildSuggestionNotifications(notificationData);
  
    const notifications = [];
    notifications.push({
      userIds: userId,
      ...notification.Recruiter,
    });
    return notifications;
  }

    /**
   *
   * @param {Integer} id
   * @param {String} recruiter
   * @param {String} type
   * @param {Integer} placement_id
   *
   * @return {Object}
   */
  buildSuggestionNotifications(notification) {
    const { id, type, userName } = notification;

    const options = this.getNotificationOptions(id, type, {});

    const items = {
      Recruiter: {
        payload: {
          data: {
            title: Antl.formatMessage('notifications.placement.suggestionUpdate.recruiter.title', { userName }),
            body: Antl.formatMessage('notifications.placement.suggestionUpdate.recruiter.body'),
            ...options,
          },
        },
      },
    };

    return items;
  }

   /**
   *
   * @param {Object} placement
   * @param {Integer} type
   *
   * @return {Object}
   */
    async getPayloadNotificationOnApprove(placement, type) {
      const {
        created_by: userId,
        id: placement_id
      } = placement;
  
      const user = await UserRepository.getDetails(userId);
      const notificationData = {
        id: placement_id,
        recruiter: user.full_name,
        type
      };
      const notification = this.buildApproveNotifications(notificationData);
      const financeUsers = await UserRepository.getUsersByRole(userRoles.Finance);
      const userIds = financeUsers.rows.map(({ id }) => id);


      const notifications = [];
      notifications.push({
        userIds,
        ...notification.Finance,
      });
      return notifications;
    }
  
      /**
     *
     * @param {Integer} id
     * @param {String} recruiter
     * @param {String} type
     * @param {Integer} placement_id
     *
     * @return {Object}
     */
    buildApproveNotifications(notification) {
      const { recruiter, type, id } = notification;

      const options = this.getNotificationOptions(id, type, {});
  
      const items = {
        Finance: {
          payload: {
            data: {
              title: Antl.formatMessage('notifications.placement.approve.finance.title', { recruiterName: recruiter }),
              body: Antl.formatMessage('notifications.placement.approve.finance.body'),
              ...options,
            },
          },
        },
      };
  
      return items;
    }
  
    /**
   *
   * @param {Object} placement
   * @param {Integer} type
   *
   * @return {Object}
   */
  async getPayloadNotificationOnUpdate(placement, type) {
    const {
      created_by: userId,
      id: placement_id
    } = placement;
    
    const [suggestedUpdate = {}] = (
      await PlacementSuggestedUpdate.query()
        .where('placement_id', placement_id)
        .orderBy('created_at', 'desc')
        .limit(1)
        .fetch()
    ).toJSON();
    const {  user_id : requestUserId = null } = suggestedUpdate;

    const user = await UserRepository.getDetails(userId);
    const notificationData = {
      id: placement_id,
      recruiter: user.full_name,
      type
    };
    const notification = this.buildUpdateNotifications(notificationData);
  
    const notifications = [];
    notifications.push({
      userIds: [requestUserId],
      ...notification.Coach,
    });
    return notifications;
  }

  /**
 *
 * @param {Integer} id
 * @param {String} recruiter
 * @param {String} type
 * @param {Integer} placement_id
 *
 * @return {Object}
 */
  buildUpdateNotifications(notification) {
    const { id, recruiter, type } = notification;

    const options = this.getNotificationOptions(id, type, {});

    const items = {
      Coach: {
        payload: {
          data: {
            title: Antl.formatMessage('notifications.placement.updated.coach.title', { recruiterName: recruiter }),
            body: Antl.formatMessage('notifications.placement.updated.coach.body'),
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
   * @param {Object} args
   * 
   * @return {Object}
   */
  getNotificationOptions(id, type, args) {
    const urlOptions = {
      Creation: {
        click_url: `${Env.get('PUBLIC_URL_WEB')}/placements?id=${id}#pendingValidations`,
        click_action: `/placements?id=${id}#pendingValidations`,
      },
      Update: {
        click_url: `${Env.get('PUBLIC_URL_WEB')}/placements?id=${id}#pendingValidations`,
        click_action: `/placements?id=${id}#pendingValidations`,
      },
      SuggestionUpdate: {
        click_url: `${Env.get('PUBLIC_URL_WEB')}/placements?id=${id}`,
        click_action: `/placements?id=${id}#pendingValidations`,
      },
      Approve: {
        click_url: `${Env.get('PUBLIC_URL_WEB')}/placements?id=${id}#pendingInvoice`,
        click_action: `/placements?id=${id}#pendingInvoice`,
      },
    };

    const options = [
      {
        notificationType: notificationTypes.Placement.Created,
        format: {
          icon: 'placements',
          color: '#4559EB',
          ...urlOptions.Creation,
        },
      },
      {
        notificationType: notificationTypes.Placement.SuggestionUpdate,
        format: {
          icon: 'placements',
          color: '#4559EB',
          ...urlOptions.SuggestionUpdate,
        },
      },
      {
        notificationType: notificationTypes.Placement.Updated,
        format: {
          icon: 'placements',
          color: '#4559EB',
          ...urlOptions.Update,
        },
      },
      {
        notificationType: notificationTypes.Placement.Approved,
        format: {
          icon: 'placements',
          color: '#4559EB',
          ...urlOptions.Approve,
        },
      }
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

module.exports = PlacementNotification;
