'use strict';
const appInsights = require("applicationinsights");
const axios = require('axios').default;
class NotificationServiceV2 {
  constructor(config) {
    this.notificationsApiUrl = config.get('notificationv2.notificationsApiUrl');
    this.notificationsApiToken = config.get('notificationv2.notificationsApiToken');
    this.replicate = this.parseReplicate(config.get('notification.replicate'));

    this.notificationsApiUrlV1 = config.get('notification.notificationsApiUrl');
    this.notificationsApiTokenV1 = config.get('notification.notificationsApiToken');
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
      if (this.replicate) {
        await this.replicateRegistrationToken(payload);
      }
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
      const response = await axios.post(url, { sendNotification: true, ...payload }, { headers });
      if (this.replicate) {
        await this.replicateNotificationToUsers({...payload, sendNotification:  false});
      }
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
      const response = await axios.post(url,  { sendNotification: true, ...payload }, { headers });
      if (this.replicate) {
        await this.replicateMultiDeviceNotificationToUsers({...payload, sendNotification:  false});
      }
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


  async replicateRegistrationToken(payload) {
    try {
      const url = `${this.notificationsApiUrlV1}/storeToken`;
      const headers = {
        Authorization: this.notificationsApiTokenV1
      };
      const response = await axios.post(url, payload, {headers});
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
  }

  async replicateNotificationRead(inputUserId, notificationId) {
    const userId = Number(inputUserId);

    if (!Number.isInteger(userId)) {
      throw new Error('inputUserId must be an integer');
    }

    const payload = {
      userId,
      notificationId
    };

    try {
      const url = `${this.notificationsApiUrlV1}/markNotificationAsRead`;
      const headers = {
        Authorization: this.notificationsApiTokenV1
      };
      const response = await axios.post(url, payload, {headers});
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

  async replicateMultiDeviceNotificationToUsers(payload) {
  try {
      const url = `${this.notificationsApiUrlV1}/sendMultiDeviceNotificationToUsers`;
      const headers = {
        Authorization: this.notificationsApiTokenV1
      };
      const response = await axios.post(url, payload, { headers });
      return response;
    } catch(error) {
      appInsights.defaultClient.trackException({exception: error});
      appInsights.defaultClient.trackEvent({name: "Notification Error", properties: payload});
    }
  }

  async replicateNotificationToUsers(payload) {
    try {
      const url = `${this.notificationsApiUrlV1}/sendNotificationToUsers`;
      const headers = {
        Authorization: this.notificationsApiTokenV1
      };
      const response = await axios.post(url, payload, { headers });
      return response;
    } catch(error) {
      appInsights.defaultClient.trackException({exception: error});
      appInsights.defaultClient.trackEvent({name: "Notification Error", properties: payload});
    }
  }

  parseReplicate(input) {
    return input === 'false' ? false : true; 
  }
}

module.exports = NotificationServiceV2;