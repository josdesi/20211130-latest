'use strict';
const appInsights = require("applicationinsights");
const axios = require('axios').default;
class NotificationService {
  constructor(config) {
    this.coachesIds = JSON.parse(config.get('notification.coachesIds'));
    this.notificationsApiUrl = config.get('notification.notificationsApiUrl');
    this.notificationsApiToken = config.get('notification.notificationsApiToken');

    this.notificationsV2ApiUrl = config.get('notificationv2.notificationsApiUrl');
    this.notificationsV2ApiToken = config.get('notificationv2.notificationsApiToken');
  }

  async addRegistrationToken(inputUserId, token, deviceType) {
    const userId = Number(inputUserId);

    if (!Number.isInteger(userId)) {
      throw new Error('inputUserId must be an integer');
    }

    const payload = {
      userId,
      token,
      deviceType
    };

    try {
      const url = `${this.notificationsApiUrl}/storeToken`;
      const headers = {
        Authorization: this.notificationsApiToken
      };
      const response = await axios.post(url, payload, {headers});
      await this.replicateRegistrationToken(payload);
      return {
        code: response.status,
        message: response.data.message
      };
    } catch(error) {
      if (error.response && (error.response.status >= 400 && error.response.status <= 499)) {
        return {
          code: error.response.status,
          message: error.response.data.message
        };
      }
      appInsights.defaultClient.trackException({exception: error});
      return {
        code: 500,
        message: 'There was a problem adding token'
      };
    }

  };

  async replicateRegistrationToken(payload) {
    try {
      const url = `${this.notificationsV2ApiUrl}/firebase-tokens`;
      const headers = this.getAuthenticationHeaders();
      return await axios.post(url, payload, {headers});
    } catch(error) {
      appInsights.defaultClient.trackException({exception: error});
    }
  }

  async getNotificationHistory(params) {
    const userId = Number(params.userId);

    if (!Number.isInteger(userId)) {
      throw new Error('inputUserId must be an integer');
    }

    const headers = {
      Authorization: this.notificationsApiToken
    };
    const url = `${this.notificationsApiUrl}/getNotificationHistory`;

    try {
      const response = await axios.get(url, {headers, params});

      return {
        code: response.status,
        data:  {...response.data}
      };
    } catch(error) {
      appInsights.defaultClient.trackException({exception: error});
      return {
        code: 500,
        data: {
          message: 'There was a problem getting notification history'
        }
      };
    }
  }

  async markNotificationAsRead(inputUserId, notificationId) {
    const userId = Number(inputUserId);

    if (!Number.isInteger(userId)) {
      throw new Error('inputUserId must be an integer');
    }

    const payload = {
      userId,
      notificationId
    };

    try {
      const url = `${this.notificationsApiUrl}/markNotificationAsRead`;
      const headers = {
        Authorization: this.notificationsApiToken
      };
      const response = await axios.post(url, payload, {headers});
      await this.replicateNotificationRead(`${userId}-${notificationId}`);
      return {
        code: response.status,
        data: response.data
      };
    } catch(error) {
      if (error.response && (error.response.status >= 400 && error.response.status <= 499)) {
        return {
          code: error.response.status,
          message: error.response.data.message
        };
      }
      appInsights.defaultClient.trackException({exception: error});
      return {
        code: 500,
        message: 'There was a problem updating notification'
      };
    }
  }

  async replicateNotificationRead(notificationId) {
    try {
      const url = `${this.notificationsV2ApiUrl}/notifications/${notificationId}/read`;
      const headers = this.getAuthenticationHeaders();
      return await axios.post(url, null, {headers});
    } catch(error) {
      appInsights.defaultClient.trackException({exception: error});
    }
  }

  async sendNotificationToUsers(payload){
    try {
      const url = `${this.notificationsApiUrl}/sendNotificationToUsers`;
      const headers = {
        Authorization: this.notificationsApiToken
      };
      const response = await axios.post(url, payload, { headers });
      await this.replicateNotification({sendNotification: false, ...payload, idFromOldService: response.data.trackingReferenceId});
      return response;
    } catch(error) {
      appInsights.defaultClient.trackException({exception: error});
      appInsights.defaultClient.trackEvent({name: "Notification Error", properties: payload});
    }
  }

  excludeCoachesFromPayload(payload) {
    const userIds = Array.isArray(payload.userIds) ? payload.userIds : [payload.userIds];
    const filteredUserIds = userIds.filter(id => !this.coachesIds.includes(id));
    return {
      ...payload,
      userIds: filteredUserIds
    };
  }

  async sendMultiDeviceNotificationToUsers(payload){
    try {
      const url = `${this.notificationsApiUrl}/sendMultiDeviceNotificationToUsers`;
      const headers = {
        Authorization: this.notificationsApiToken
      };
      const response = await axios.post(url, payload, { headers });
      await this.replicateNotification({sendNotification: false, ...payload, idFromOldService: response.data.trackingReferenceId});
      return response;
    } catch(error) {
      appInsights.defaultClient.trackException({exception: error});
      appInsights.defaultClient.trackEvent({name: "Notification Error", properties: payload});
    }
  }

  async replicateNotification(payload) {
    try {
      const url = `${this.notificationsV2ApiUrl}/notifications/`;
      const headers = this.getAuthenticationHeaders();
      const response = await axios.post(url, payload, { headers });
      return response;
    } catch(error) {
      appInsights.defaultClient.trackException({exception: error});
      appInsights.defaultClient.trackEvent({name: "Notification Error", properties: payload});
    }
  }

  async getTrackedNotificationsByParams(startDate, endDate){
    const url = `${this.notificationsApiUrl}/getTrackedNotifications`;
    const headers = {
      Authorization: this.notificationsApiToken
    };
    const params = {
      startDate,
      endDate
    }
    const timeout = 60 * 6 * 1000
    try {
      const response = await axios.get(url, { headers, params, timeout });

      return {
        code: response.status,
        data: [...response.data]
      }
    } catch (error) {
      appInsights.defaultClient.trackException({exception: error});      
    }
  }

  getAuthenticationHeaders() {
    return {
      'x-functions-key': this.notificationsV2ApiToken
    };
  }
}

module.exports = NotificationService;