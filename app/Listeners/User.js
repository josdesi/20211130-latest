'use strict';

//Utils
const appInsights = require('applicationinsights');
const { MicrosoftGraphSubscriptionTypes, parseBoolean } = use('App/Helpers/Globals');
const Env = use('Env');

//Services
const NotificationService = use('Services/Notification');

//Repositories
const UserRepository = new (use('App/Helpers/UserRepository'))();
const MicrosoftGraph = new (use('App/Helpers/MicrosoftGraph'))();
const InventoryNotification = new (use('App/Notifications/InventoryNotifications'))();



const User = {
  refreshUsersView: async () => {
    try {
      await UserRepository.refreshUsersView();
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
    }
  },

  logChange: async ({userId, entity, operation, payload, authUserId}) => {
    try {
      await UserRepository.logChange(userId, entity, operation, payload, authUserId);
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
    }
  }, 
  
  broadcast: async ({userId, authUserId, payload}) => {
    try {
      await UserRepository.broadcastLog({ 
        userId,
        authUserId,
        payload
      });
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
    }
  }, 

  refreshFailedGraphSubscriptionRenewal: async ({ failedRenewals }) => {
    try {
      const expiredRenewals = await UserRepository.getExpiredGraphSubscriptions();
      const expiredSubscriptionIds = expiredRenewals.map(({ subscription_id }) => subscription_id);

      const subscriptionIds = failedRenewals.map(({ subscription_id }) => subscription_id);
      subscriptionIds.push(...expiredSubscriptionIds);

      if (subscriptionIds.length <= 0) return;

      const userIds = await UserRepository.getUserIdsBySubscriptionIds(subscriptionIds);

      const newGraphSubscriptionsPromises = userIds.map((userId) =>
        User.generateMicrosoftGraphSubscription({ user: { id: userId } })
      );

      const regenerations = await Promise.all(newGraphSubscriptionsPromises);

      const failedRegenerations = regenerations.filter((renewal) => !renewal.success);

      if (failedRegenerations.length > 0) {
        appInsights.defaultClient.trackEvent({
          name: 'Microsoft Graph Subscription Regeneration Failed',
          properties: { failedRegenerations },
        });
      }
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
    }
  },

  generateMicrosoftGraphSubscription: async ({ user }) => {
    try {
      const isOutlookTrackingEnabled = parseBoolean(Env.get('ENABLE_OUTLOOK_TRACKING', false));
      if (!isOutlookTrackingEnabled) return;

      if(!Env.get('CLIENT_STATE') || !Env.get('GRAPH_SUBSCRIPTION_URL')){
        throw 'Microsoft Graph Subscription env variables not found'
      }
      // await MicrosoftGraph.generateMicrosoftGraphSubscription(user.id, MicrosoftGraphSubscriptionTypes.mail.inbox); //As of right now, only sent will be tracked
      await MicrosoftGraph.generateMicrosoftGraphSubscription(user.id, MicrosoftGraphSubscriptionTypes.mail.sent);
      return { success: true };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
      return { success: false, error, user }
    }
  },
  
  notifyOnOfficeItemsReassign: async ({ wereItemsMoved, userId, coachTeamId }) => {
    try {
      if(!wereItemsMoved){
        return;
      }
      const notifications = await InventoryNotification.getPayloadNotificationOnOfficeAssignation(userId, coachTeamId);
      const notificationPromises = notifications.map((notification) => NotificationService.sendNotificationToUsers(notification));
      await Promise.all(notificationPromises); 
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
    }
  },
};

module.exports = User;
