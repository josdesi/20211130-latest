'use strict';

//Repositories
const UserRepository = new (use('App/Helpers/UserRepository'))();
const SendgridConfigurationRepository = new (use('App/Helpers/SendgridConfigurationRepository'))();

//Utils
const NotificationService = use('Services/NotificationV2');
const SendgridService = use('Services/Sendgrid');
const appInsights = require('applicationinsights');
const Env = use('Env')
const { uniqBy } = use('lodash');

class SummaryEmailV2 {
  /**
   *
   * @param {Date} startDate
   * @param {Date} endDate
   *
   * @return {void}
   */
  async send(startDate, endDate) {
    try {
      const type = 'summary'
      const notificationsLimit = 10
  
      const notifications = await this.getNotifications(startDate, endDate)
      if(notifications === null || notifications.length <= 0){
        console.log("There was no notifications to send today")
        return false
      }
  
      const sortedNotifications = this.sortNotifications(notifications, notificationsLimit)
      
      const emails = await this.getEmails(sortedNotifications)
  
      const recruitersData = this.mergeRecruiterData(sortedNotifications, emails)
  
      const personalizations = this.buildEmailPersonalizations(recruitersData)
      
      const sendgridJSON = await this.buildNotificationSendgridJSON(personalizations, type)
      
      await SendgridService.sendEmailsToUsers(sendgridJSON);
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
    }
  }  

  getNewHour(date, ms = 0) {
    return new Date(new Date(date).getTime() + ms).toISOString();
  }

  async getNotifications(startDate, endDate) {
    const hour = 60 * 60 * 1000;
    const second = 1000;
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    const skipSteps = 12;

    const totalHours = (end - start) / hour;
    const hourSkipRange = totalHours / skipSteps;

    const data = [];
    let newStartDate = this.getNewHour(startDate);
    let newEndDate = this.getNewHour(startDate, hourSkipRange * hour);
    for (let index = 0; index < skipSteps; index++) {
      const response = await NotificationService.getTrackedNotificationsByParams(newStartDate, newEndDate);
      const responseData = response.code === 200 ? response.data : []
      data.push(...responseData);

      newStartDate = this.getNewHour(newEndDate, second);
      newEndDate = this.getNewHour(newEndDate, hourSkipRange * hour);
    }

    const uniqNotifications = uniqBy(data, 'id');

    return uniqNotifications;
  }
  
  sortNotifications(notifications, notificationsLimit){
    let sortedNotifications = this.groupNotificationsByUserId(notifications)
    return this.applyNotificationsLimit(sortedNotifications, notificationsLimit)
  }
  
  groupNotificationsByUserId(notifications){
    let sortedNotifications = []
    const publicUrlWeb = Env.get('PUBLIC_URL_WEB')
  
    notifications.forEach((notification) => {
      const userIds = notification.metadata.userIds    
      userIds.map((userId) => {
        if(userId == 'null' || userId === null){
          return false
        }
  
        const index = sortedNotifications.findIndex(row => row.userId == userId)
  
        const notificationTitleBody = {
          title: notification.data.title,
          body: notification.data.body,
          url:`${publicUrlWeb}${notification.data.click_action}`
        }
  
        if(index < 0){
          sortedNotifications = [
            ...sortedNotifications,
            {
              userId,
              notifications:[notificationTitleBody]
            }
          ]
        }else{
          sortedNotifications[index].notifications = [
            ...sortedNotifications[index].notifications,
            notificationTitleBody
          ]
        }
  
      })
    })
  
    return sortedNotifications
  }
  
  applyNotificationsLimit(sortedNotifications, notificationsLimit){
    return sortedNotifications.map((row) => {    
      const notificationsCount = Object.keys(row.notifications).length
  
      row.notificationsSurplus = 0
  
      if(notificationsCount > notificationsLimit){
        row.notificationsSurplus = notificationsCount - notificationsLimit
        row.notifications = row.notifications.slice(0, 10)
      }
  
      return row
    })
  }

  async getEmails(sortedNotifications){
    const userIds = sortedNotifications.map((notification) => {
      return notification.userId
    })
    
    return await UserRepository.userEmails(userIds)
  }

  mergeRecruiterData(sortedNotifications, emails){
    return sortedNotifications.flatMap((userNotification) => {
      let result = emails.filter(row => row.id == userNotification.userId);

      if(result === null || result.length == 0){
        return []
      }

      if(this.isTestingEmail(result[0].email) && Env.get('SEND_REAL_USERS') !== 'true'){
        return []
      }

      userNotification.email = result[0].email
      userNotification.first_name = result[0].first_name    
      return userNotification
    })
  }  
  
  buildEmailPersonalizations(recruiters){
    const publicUrlWeb = Env.get('PUBLIC_URL_WEB')

    return recruiters.map((user) => {
      return {
        to: user.email,
        dynamic_template_data: {
          name: user.first_name,
          notifications: user.notifications,
          notificationsSurplus: user.notificationsSurplus,
          notification_url: `${publicUrlWeb}${Env.get('NOTIFICATION_WEB_URL')}`
        }
      }     
    })
  }
  
  async buildNotificationSendgridJSON(personalizations, type){
    const SendgridConfiguration = await SendgridConfigurationRepository.getByType(type)

    return {
      personalizations,
      from: SendgridConfiguration.sender,
      templateId: SendgridConfiguration.template_id,
    }
  }

  /**
   * This method was created to filter out any other emails than these,
   *  in production it is expected to be disabled
   */
  isTestingEmail(email){
    const emails = (Env.get('EMAILS_FOR_TESTING')).split(',')
    return !emails.includes(email)
  }

}

module.exports = SummaryEmailV2;
