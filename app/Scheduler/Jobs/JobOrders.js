//Utils
const { DateFormats,EntityTypes } = use('App/Helpers/Globals');
const { every } = use('lodash');
const { JobNames } = use('App/Scheduler/Constants');
const moment = use('moment');
const appInsights = require('applicationinsights');
const { notificationTypes } = use('App/Notifications/Constants');

//Repositories
const JobOrderRepository = new (use('App/Helpers/JobOrderRepository'))();
const OperatingNotification = new (use('App/Notifications/OperatingNotifications'))();
const OperatingMetricConfiguration = use('App/Models/OperatingMetricConfiguration');
//Services
const NotificationService = use('Services/Notification');

module.exports = agenda => {
  agenda.define(JobNames.JobOrders.OperatingReminders, async (job) => {
    try {
      const jobOrderId = job.attrs.data.id;
      const userId = job.attrs.data.userId;
      if(!Number.isFinite(jobOrderId) || !Number.isFinite(userId)){
        throw `Some of the params are missing`;
      }
      const isAnOngoingItem = await JobOrderRepository.isAnOngoingItem(jobOrderId);
      const operatingMetric = await JobOrderRepository.getCurrentOperating(jobOrderId, userId);
      const isEmpty = every(operatingMetric ? operatingMetric.checklist : { completed: true }, { completed: false });
      const time = moment.utc().format(DateFormats.SystemDefault);
      if (
        operatingMetric &&
        isEmpty &&  
        moment.utc(operatingMetric.end_date).format(DateFormats.SystemDefault) > time &&
        isAnOngoingItem
      ) {
        //Notification Logic
        const notifications = await OperatingNotification.getPayloadNotificationOnMetricReminder(jobOrderId, notificationTypes.JobOrder.OperatingMetricReminder, userId);
        notifications.map(async (notification) => {
          await NotificationService.sendNotificationToUsers(notification);
        });
      }
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: `${error} for ${job}` });
    }
  });
 
  agenda.define(JobNames.JobOrders.OperatingMetrics, async (job) => {
    try {
      const userId = job.attrs.data.userId;
      const jobOrderId = job.attrs.data.id;
      if(!Number.isFinite(jobOrderId) || !Number.isFinite(userId)){
        throw `Some of the params are missing`;
      }
      const isAnOngoingItem = await JobOrderRepository.isAnOngoingItem(jobOrderId);
      const currentMetric = await JobOrderRepository.getCurrentOperating(jobOrderId, userId);
      if(currentMetric || !isAnOngoingItem){
        return null;
      }
      const operatingMetric = await JobOrderRepository.initializeOperatingMetrics(jobOrderId, userId);
      if(!operatingMetric){
        return null;
      }   
      const metrics = operatingMetric.toJSON();
      const templateMetrics = await OperatingMetricConfiguration.findBy('entity', EntityTypes.JobOrder); 
      const timeBeforeRenew = (templateMetrics && templateMetrics.before_metric_renew) || '12 hours';
      const [ duration , time ] = timeBeforeRenew.split(' ');
      const beforeRenewDate = moment(operatingMetric.end_date).subtract(Number(duration),time).format(DateFormats.AgendaFormat);
      const notifications = await OperatingNotification.getPayloadNotificationOnMetricRenewed(metrics, notificationTypes.JobOrder.OperatingMetricRenewed, userId);
      notifications.map(async (notification) => {
        await NotificationService.sendNotificationToUsers(notification);
      });
      await agenda.create(JobNames.JobOrders.BeforeOperatingRenew,
        {
          entityType: EntityTypes.JobOrder,
          id: Number(jobOrderId),
          userId
        })
        .schedule(beforeRenewDate)
        .save();
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: `${error} for ${job}` });
    }
  });


  agenda.define(JobNames.JobOrders.BeforeOperatingRenew, async (job) => {
    try {
      const NotificationService = use('Services/Notification');
      const jobOrderId = job.attrs.data.id;
      const userId = job.attrs.data.userId;
      if(!Number.isFinite(jobOrderId) || !Number.isFinite(userId)){
        throw `Some of the params are missing`;
      }
      const isAnOngoingItem = await JobOrderRepository.isAnOngoingItem(jobOrderId);
      if(!isAnOngoingItem){
        return;
      }
      const currentMetric = await JobOrderRepository.getCurrentOperating(jobOrderId, userId);
      if(!currentMetric || !currentMetric.checklist){
        return null;
      }
      const isCompleted = every(currentMetric.checklist, { completed: true });
      if (!isCompleted) {
        const notification = await OperatingNotification.getPayloadNotificationBeforeRenew(jobOrderId, notificationTypes.JobOrder.BeforeOperatingRenew, userId);
        await NotificationService.sendNotificationToUsers(notification);
      }
      await agenda.cancel({
        name: JobNames.JobOrders.BeforeOperatingRenew,
        'data.id': jobOrderId,
        'data.entityType': EntityTypes.JobOrder,
        'data.userId':userId
      });
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: `${error} for ${job}` });
    }
  });

  agenda.define(JobNames.JobOrders.AccountabilityCheck, async (job) => {
    try {
      await JobOrderRepository.markJobOrdersFreeGame({ evaluateAll: true });
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: `${error} for ${job}` });
    }
  });

  //This method is only to prevent Agenda crashing by not finding the job
  agenda.define('joborder:first:operating', async (job) => {
    return null;
  });
};