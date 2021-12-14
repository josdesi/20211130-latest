'use strict';
const moment = require('moment');
const appInsights = require('applicationinsights');
const NotificationProvider = use('Services/Notification');
const SummaryEmail = new (use('App/Emails/SummaryEmail'))();
class NotificationController {
  async addRegistrationToken({ request, auth, response }) {
    const token = request.input('token');
    const deviceType = request.input('platform');
    if (typeof token !== 'string') {
      return response.status(400).send({ message: 'token must be a string' });
    }

    const userId = auth.current.user.id;
    const { code, message } = await NotificationProvider.addRegistrationToken(userId, token, deviceType);

    return response.status(code).send({ message: message });
  }

  async getNotificationHistory({ request, auth, response }) {
    const { page, perPage, visibility, type } = request.all();
    const userId = auth.current.user.id;
    const params = {
      page,
      perPage,
      userId,
      visibility,
      type
    };
    const { code, data } = await NotificationProvider.getNotificationHistory(params);

    return response.status(code).send(data);
  }

  async markNotificationAsRead({ request, auth, response }) {
    const notificationId = request.input('notificationId');

    if (typeof notificationId !== 'string') {
      return response.status(400).send({ message: 'token must be a string' });
    }

    const userId = auth.current.user.id;
    const { code, message } = await NotificationProvider.markNotificationAsRead(userId, notificationId);

    return response.status(code).send({ message: message });
  }

  async sendDailySummary() {
    try {
      //Needs the full string in ISO 8601, format() without args returns the full string
      const startDate = moment().subtract(1, "days").format();
      const endDate = moment().format();
      
      await SummaryEmail.send(startDate, endDate)
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
    }
  }
}

module.exports = NotificationController;
