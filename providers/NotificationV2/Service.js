'use strict';
const appInsights = require("applicationinsights");
const axios = require('axios').default;
class NotificationServiceV2 {
  constructor(config) {
    this.notificationsApiUrl = config.get('notificationv2.notificationsApiUrl');
    this.notificationsApiToken = config.get('notificationv2.notificationsApiToken');
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
      const url = `${this.notificationsApiUrl}/firebase-tokens`;
      const headers = this.getAuthenticationHeaders();
      const response = await axios.post(url, payload, {headers});

      return {
        code: response.status,
        message: response.data.message
      };
    } catch(error) {
      return this._handleError(error, 'There was a problem adding token');
    }
  }

  async getNotificationHistory(params) {
    const userId = Number(params.userId);

    if (!Number.isInteger(userId)) {
      throw new Error('inputUserId must be an integer');
    }

    const headers = this.getAuthenticationHeaders();
    const url = `${this.notificationsApiUrl}/notifications/history`;

    try {
      const response = await axios.get(url, {headers, params});

      return {
        code: response.status,
        data:  {...response.data}
      };
    } catch(error) {
      return this._handleError(error, 'There was a problem getting notification history');
    }
  }

  async markNotificationAsRead(inputUserId, notificationId) {
    try {
      const url = `${this.notificationsApiUrl}/notifications/${notificationId}/read`;
      const headers = this.getAuthenticationHeaders();
      const response = await axios.post(url, null, {headers});

      return {
        code: response.status,
        data: response.data
      };
    } catch(error) {
      return this._handleError(error, 'There was a problem updating notification');
    }
  }

  async sendNotificationToUsers(payload){
    try {
      const url = `${this.notificationsApiUrl}/notifications/`;
      const headers = this.getAuthenticationHeaders();
      const response = await axios.post(url, payload, { headers });
      return response;
    } catch(error) {
      appInsights.defaultClient.trackEvent({name: "Notification Error", properties: payload});
      return this._handleError(error);
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
      const url = `${this.notificationsApiUrl}/notifications/`;
      const headers = this.getAuthenticationHeaders();
      const response = await axios.post(url, payload, { headers });
      return response;
    } catch(error) {
      appInsights.defaultClient.trackEvent({name: "Notification Error", properties: payload});
      return this._handleError(error);
    }
  }

  async getTrackedNotificationsByParams(startDate, endDate){
    const url = `${this.notificationsApiUrl}/notification-logs`;
    const headers = this.getAuthenticationHeaders();
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
      return this._handleError(error, 'There was an error getting notification logs');   
    }
  }

  getAuthenticationHeaders() {
    return {
      'x-functions-key': this.notificationsApiToken
    };
  }

  _handleError(error, defaultMessage) {
    if (error.response && (error.response.status >= 400 && error.response.status <= 499)) {
      return {
        code: error.response.status,
        message: error.response.data.message
      };
    }
    appInsights.defaultClient.trackException({exception: error});
    return {
      code: 500,
      message: defaultMessage
    };
  }
}

module.exports = NotificationServiceV2;