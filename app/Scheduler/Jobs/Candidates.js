//Utils
const { DateFormats,EntityTypes } = use('App/Helpers/Globals');
const { every } = use('lodash');
const { JobNames } = use('App/Scheduler/Constants');
const moment = use('moment');
const { notificationTypes } = use('App/Notifications/Constants');
const appInsights = require('applicationinsights');

//Repositories
const CandidateRepository = new (use('App/Helpers/CandidateRepository'))();
const OperatingNotification = new (use('App/Notifications/OperatingNotifications'))();
const OperatingMetricConfiguration = use('App/Models/OperatingMetricConfiguration');

//Services
const NotificationService = use('Services/Notification');


module.exports = (agenda) => {
  agenda.define(JobNames.Candidates.OperatingReminders, async (job) => {
    try {
      const candidateId = job.attrs.data.id;
      const userId = job.attrs.data.userId;
      if(!Number.isFinite(candidateId) || !Number.isFinite(userId)){
        throw `Some of the params are missing`;
      }
      const isAnOngoingItem = await CandidateRepository.isAnOngoingItem(candidateId);
      const operatingMetric = await CandidateRepository.getCurrentOperating(candidateId,userId);
      const isEmpty = every(operatingMetric ? operatingMetric.checklist : { completed: true }, { completed: false });
      const time = moment.utc().format(DateFormats.SystemDefault);
      if (
        operatingMetric &&
        isEmpty &&  
        moment.utc(operatingMetric.end_date).format(DateFormats.SystemDefault) > time &&
        isAnOngoingItem
      ) {
        //Notification Logic
        console.log('Schedule Candidate Notification reminder', job.attrs.data.id, operatingMetric.id);
        const notifications = await OperatingNotification.getPayloadNotificationOnMetricReminder(candidateId, notificationTypes.Candidate.OperatingMetricReminder, userId);
        notifications.map(async (notification) => {
          await NotificationService.sendNotificationToUsers(notification);
        });
      }
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: `${error} for ${job}` });
    }
  });

  agenda.define(JobNames.Candidates.OperatingMetrics, async (job) => {
    try {
      const userId = job.attrs.data.userId;
      const candidateId = job.attrs.data.id;
      if(!Number.isFinite(candidateId) || !Number.isFinite(userId)){
        throw `Some of the params are missing`;
      }
      const isAnOngoingItem = await CandidateRepository.isAnOngoingItem(candidateId);
      const currentMetric = await CandidateRepository.getCurrentOperating(candidateId, userId);
      if(currentMetric || !isAnOngoingItem){
        return;
      }
      const operatingMetric = await CandidateRepository.initializeOperatingMetrics(candidateId, userId);
      if(!operatingMetric){
        return null;
      }
      const metrics = operatingMetric.toJSON();
      const templateMetrics = await OperatingMetricConfiguration.findBy('entity', EntityTypes.Candidate); 
      const timeBeforeRenew = (templateMetrics && templateMetrics.before_metric_renew) || '12 hours';
      const [ duration , time ] = timeBeforeRenew.split(' ');
      const beforeRenewDate = moment(operatingMetric.end_date).subtract(Number(duration),time).format(DateFormats.AgendaFormat);
      const notifications = await OperatingNotification.getPayloadNotificationOnMetricRenewed(metrics, notificationTypes.Candidate.OperatingMetricRenewed, userId);
      notifications.map(async (notification) => {
        await NotificationService.sendNotificationToUsers(notification);
      });
      await agenda.create(JobNames.Candidates.BeforeOperatingRenew,
        {
          entityType: EntityTypes.Candidate,
          id: Number(candidateId),
          userId
        })
        .schedule(beforeRenewDate)
        .save();
      console.log('Schedule Candidate Metrics created new Operating', job.attrs.data.id);
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: `${error} for ${job}` });
    }
  });

  agenda.define(JobNames.Candidates.BeforeOperatingRenew, async (job) => {
    try {
      const candidateId = job.attrs.data.id;
      const userId = job.attrs.data.userId;
      if(!Number.isFinite(candidateId) || !Number.isFinite(userId)){
        throw `Some of the params are missing`;
      }
      const isAnOngoingItem = await CandidateRepository.isAnOngoingItem(candidateId);
      if(!isAnOngoingItem){
        return;
      }
      const currentMetric = await CandidateRepository.getCurrentOperating(candidateId, userId);
      if(!currentMetric || !currentMetric.checklist){
        return null;
      }
      const isCompleted = every(currentMetric.checklist, { completed: true });
      if (!isCompleted) {
        const notification = await OperatingNotification.getPayloadNotificationBeforeRenew(candidateId, notificationTypes.Candidate.BeforeOperatingRenew, userId);
        await NotificationService.sendNotificationToUsers(notification);
      }
      await agenda.cancel({
        name: JobNames.Candidates.BeforeOperatingRenew,
        'data.id': candidateId,
        'data.entityType': EntityTypes.Candidate,
        'data.userId':userId
      });
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: `${error} for ${job}` });
    }
  });

  agenda.define(JobNames.Candidates.AccountabilityCheck, async (job) => {
    try {
      await CandidateRepository.markCandidatesFreeGame({ evaluateAll: true });
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: `${error} for ${job}` });
    }
  });

  //This method is only to prevent Agenda crashing by not finding the job
  agenda.define('candidate:first:operating', async (job) => {
    return null;
  });
};
