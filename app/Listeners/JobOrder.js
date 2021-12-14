'use strict'
//Utils
const appInsights = require('applicationinsights');
const { JobOrderTypeSchemes, EntityTypes, OperationType, AdditionalRecruiterStatus, AdditionalRecruiterTypes, DateFormats } = use('App/Helpers/Globals');
const Agenda = use('Services/Agenda');
const { JobNames } = use('App/Scheduler/Constants');
const OperatingMetricConfiguration = use('App/Models/OperatingMetricConfiguration');
const { notificationTypes } = use('App/Notifications/Constants');
const NotificationService = use('Services/Notification');
const { every } = use('lodash');
const moment = use('moment');
//Repositories
const JobOrderRepository = new (use('App/Helpers/JobOrderRepository'))();
const InventoryNotification = new (use('App/Notifications/InventoryNotifications'))();
const OperatingNotification = new (use('App/Notifications/OperatingNotifications'))();
const CandidateAndJobMatchNotification = new (use('App/Notifications/CandidateAndJobMatchNotification'))();
const RequestAdditionalRecruiterNotifications = new (use('App/Notifications/RequestAdditionalRecruiterNotifications'))();


const JobOrder = module.exports = { 
    /**
   * @deprecated  
   * Schedule the jobs for the
   * operating job order metrics
   *
   * @method scheduleMetricJobs
   *
   * @param {Integer} jobOrderId
   *
   */
  scheduleMetricJobs: async ({jobOrderId, userId}) => {
    const templateMetrics = await OperatingMetricConfiguration.findBy('entity', EntityTypes.JobOrder);
    const operatingMetrics = await JobOrderRepository.getCurrentOperating(jobOrderId,userId);
    const metricFrequency =  (templateMetrics && templateMetrics.metric_frequency) || '72 hours';
    const reminderFrequency = (templateMetrics && templateMetrics.reminder_frequency) || '1 days and 10 minutes';
    const timeBeforeRenew = (templateMetrics && templateMetrics.before_metric_renew) || '12 hours';
    const [duration , time ] = timeBeforeRenew.split(' ');
    const beforeRenewDate = moment(operatingMetrics.end_date).subtract(Number(duration),time).format(DateFormats.AgendaFormat);
    try {
      const data = {
        entityType: EntityTypes.JobOrder,
        id: Number(jobOrderId),
        userId
      };
      await Agenda.create(JobNames.JobOrders.OperatingReminders, data)
        .repeatEvery(reminderFrequency,{
          skipImmediate: true 
        })
        .save();

      await Agenda.create(JobNames.JobOrders.OperatingMetrics, data)
        .repeatEvery(metricFrequency,{
          skipImmediate: true
        })
        .save();

      
      await Agenda.create(JobNames.JobOrders.BeforeOperatingRenew, data)
        .schedule(beforeRenewDate)
        .save();
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
    }
  },


    /**
   * @deprecated  
   * Stop the jobs for an
   * operting job order metrics
   *
   * @method stopMetricJobs
   *
   * @param {Integer} jobOrderId
   *
   */
  stopMetricJobs: async ({jobOrderId, userId}) => {
    try {
      let cancelPayload = {
        'data.id': jobOrderId,
        'data.entityType': EntityTypes.JobOrder,
      };
      if(Number.isFinite(userId)){
        cancelPayload = {
          ...cancelPayload,
          'data.userId': userId
        }
      }
      await Agenda.cancel({
        name: JobNames.JobOrders.OperatingReminders,
        ...cancelPayload
      });
      await Agenda.cancel({
        name: JobNames.JobOrders.OperatingMetrics,
        ...cancelPayload
      });
      await Agenda.cancel({
        name: JobNames.JobOrders.BeforeOperatingRenew,
        ...cancelPayload
      });
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
    }
  },

  /**
   * @deprecated  
   * Generates the operationg metrics for the
   * created job order
   *
   * @method initializeOperationMetric
   *
   * @param {Object} jobOrder
   * @param {Object} whiteSheet
   *
   */
  initializeOperationMetric: async ({jobOrder = {}, additionalRecruiter = {}}) => {
    try {
      const jobOrderId = jobOrder.id || additionalRecruiter.job_order_id;
      const {  type : additionalRecruiterType = null } = additionalRecruiter;
      const userId = additionalRecruiterType === AdditionalRecruiterTypes.Accountable ? additionalRecruiter.recruiter_id : jobOrder.recruiter_id;
      const isAnOngoingItem = await JobOrderRepository.isAnOngoingItem(jobOrderId);
      if(!isAnOngoingItem){
        return;
      }
      await JobOrderRepository.initializeOperatingMetrics(jobOrderId, userId);
      await JobOrder.scheduleMetricJobs({jobOrderId, userId});
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
    }
  },


    /**
   * @deprecated  
   * Notify the complete of an operating if is
   * completed
   *
   * @method CheckMetricStatus
   *
   * @param {Object} operatingMetric
   *
   */
  checkMetricStatus: async ({operatingMetric}) => {
    try {
      const isCompleted = every(operatingMetric ? operatingMetric.checklist : { completed: false }, { completed: true });
      if(!isCompleted){
        return null;
      }
      const notifications = await OperatingNotification.getPayloadNotificationOnOperatingCompleted(operatingMetric.job_order_id, notificationTypes.JobOrder.OperatingMetricCompleted, operatingMetric.created_by);

      notifications.map(async (notification) => {
        await NotificationService.sendNotificationToUsers(notification);
      });
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
    }
  },


  notifyOnCreation: async ({jobOrder}) => {
    try {
      const notifications = await InventoryNotification.getPayloadNotificationOnCreation(jobOrder.id, notificationTypes.JobOrder.Created);

      notifications.map(async (notification) => {
        await NotificationService.sendNotificationToUsers(notification);
      });
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
    }
  },


  notifyOnStatusUpdate: async ({whiteSheet, userId, previousJobOrderTypeId}) => {
    try {
      const newTypeId = whiteSheet.job_order_type_id;
      if(newTypeId === previousJobOrderTypeId || ( newTypeId !== JobOrderTypeSchemes.SearchAssignment && newTypeId !== JobOrderTypeSchemes.Poejo)){
        return null;
      }
      const notifications = await InventoryNotification.getPayloadNotificationOnStatusUpdate(whiteSheet.job_order_id, notificationTypes.JobOrder.StatusUpdated, userId);

      const notificationPromises = notifications.map((notification) => NotificationService.sendNotificationToUsers(notification));
      await Promise.all(notificationPromises);
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
    }
  },

  /**
   * Evaluate the metrics when the
   * whitesheet is updated
   *
   * @method evaluateStatusForMetrics
   *
   * @param {Integer} jobOrderId
   * @param {Integer} userId
   * @param {Integer} previousJobOrderTypeId
   */
  evaluateStatusForMetrics: async ({jobOrderId, userId, previousJobOrderTypeId}) => {
    try {
      if(!await JobOrderRepository.isARecruiterOnTheJobOrder(jobOrderId ,userId) && !await JobOrderRepository.isACoachOnTheJobOrder(jobOrderId ,userId)){
        return null;
      }
      await JobOrderRepository.evaluateMetricsWhenStatusChange(jobOrderId, previousJobOrderTypeId, userId);
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
    }
  },


    /**
   * Fires the notification when a job order
   * is matched with a candidate
   *
   * @method notifyMatchWithCandidate
   *
   * @param {Object} jobOrderCandidateMatch
   */
  notifyMatchWithCandidate: async ({jobOrderCandidateMatch}) => {
    try {
      const { candidate_id,job_order_id } = jobOrderCandidateMatch;
      const notifications = await CandidateAndJobMatchNotification.getPayloadNotificationOnMatch(candidate_id, job_order_id, notificationTypes.JobOrder.CandidateMatched);

      notifications.map(async (notification) => {
        await NotificationService.sendNotificationToUsers(notification);
      });
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
    }
  },

  /**
   *
   * @method evaluateFreeGame
   *
   * @param {Object} jobOrderId
   */
  evaluateFreeGame: async ({ jobOrderId, shouldEvaluateFreeGame=true }) => {
    try {
      if(!jobOrderId){
        return null;
      }
      shouldEvaluateFreeGame && await JobOrderRepository.markJobOrdersFreeGame({ jobOrderId: Number(jobOrderId) });
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
    }
  }, 
    /**
   *
   * @method logChange
   *
   * @param {Object} jobOrderId
   * @param {String} entity
   * @param {String} operation
   * @param {Object} payload
   * @param {Integer} userId

   */
  logChange: async ({jobOrderId, entity, operation, payload, userId}) => {
    try {
      await JobOrderRepository.logChange(jobOrderId, entity, operation, payload, userId);
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
    }
  },    

  /**
   *
   * @method logWhiteSheetUpdate
   *
   * @param {Object} whiteSheet
   * @param {Integer} userId
   * @param {Integer} previousCandidateTypeId
   */
  logWhiteSheetUpdate: async ({ whiteSheet = {}, userId, previousJobOrderTypeId }) => {
    try {
      const { job_order_type_id: newTypeId = null, job_order_id } = whiteSheet;
      if(newTypeId !== previousJobOrderTypeId){
        await JobOrderRepository.logStatusChange(job_order_id, newTypeId, userId);
      }
      await JobOrderRepository.logChange(job_order_id, EntityTypes.Whitesheet, OperationType.Update, whiteSheet, userId);
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
    }
  },

  
    /**
   *
   * @method notifyOnRecruiterRequest
   *
   * @param {Object} additionalRecruiter
   */
  notifyOnRecruiterRequest: async ({ additionalRecruiter, userId }) => {
    try {
      const { job_order_id, recruiter_id, status, type } = additionalRecruiter;
      if (status !== AdditionalRecruiterStatus.Approved) {
        return null;
      }
      const notifications = await RequestAdditionalRecruiterNotifications.getPayloadNotificationRequestRecruiter(
        job_order_id,
        recruiter_id,
        userId,
        notificationTypes.JobOrder.AdditionalRecruiterRequested,
        type
      );

      notifications.map(async (notification) => {
        await NotificationService.sendNotificationToUsers(notification);
      });
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
    }
  },

  /**
   *
   * @method notifyOnAdditionalRecruiterRemoved
   *
   * @param {Object} additionalRecruiter
   * @param {Integer} userId
   */
  notifyOnAdditionalRecruiterRemoved: async ({ additionalRecruiter, userId }) => {
    try {
      const { job_order_id, recruiter_id, type } = additionalRecruiter;
      const notifications = await RequestAdditionalRecruiterNotifications.getPayloadNotificationOnRemoveRecruiter(
        job_order_id,
        recruiter_id,
        userId,
        notificationTypes.JobOrder.AdditionalRecruiterRemoved,
        type
      );

      const notificationPromises = notifications.map((notification) => NotificationService.sendNotificationToUsers(notification));
      await Promise.all(notificationPromises);
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
    }
  },

  /**
   *
   * @method logAssignment
   *
   * @param {object} additionalRecruiter
   * @param {string} action
   * @param {integer} userId

   */
  logAssignment: async ({additionalRecruiter, action, userId}) => {
    try {
      await JobOrderRepository.logAssignment(additionalRecruiter, action, userId);
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
    }
  },    

  
    /**
   *
   * @deprecated  
   * @method initializeMetricsOnRecruiterReassign
   *
   * @param {Object} recruiterAssignment
   * @param {Integer} previousRecruiterId
   */
  initializeMetricsOnRecruiterReassign: async ({ recruiterAssignment, previousRecruiterId }) => {
    try {
      const { job_order_id, recruiter_id } = recruiterAssignment;
      await JobOrder.stopMetricJobs({jobOrderId: job_order_id, userId: previousRecruiterId});
      const operatingMetric = await JobOrderRepository.initializeOperatingMetrics(job_order_id, recruiter_id);
      if(operatingMetric){
        appInsights.defaultClient.trackException({ exception: `The Operating for the job order <${job_order_id}> on the user <${recruiter_id}> couldn't be created` });
      
        await JobOrder.scheduleMetricJobs({jobOrderId:operatingMetric.job_order_id, userId:operatingMetric.created_by});
      }
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
    }
  }, 


  
    /**
   *
   * @method stopMetricsForAccountableRecruiter
   *
   * @param {Object} additionalRecruiter
   */
  stopMetricsForAccountableRecruiter: async ({ additionalRecruiter }) => {
    try {
      if( additionalRecruiter != null){
        const { job_order_id, recruiter_id, type } = additionalRecruiter;
        if(type === AdditionalRecruiterTypes.Accountable){
          await JobOrder.stopMetricJobs({jobOrderId: job_order_id, userId: recruiter_id});
        }
      }
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
    }
  }, 


    /**
   *
   * @method notifyOnRecruiterAssigned
   *
   * @param {Object} additionalRecruiter
   */
  notifyOnRecruiterAssigned: async ({jobOrder , recruiterAssignment, userId}) => {
    try {
      let notifications;
      if(jobOrder){
        if(jobOrder.recruiter_id===userId){ 
          return null; 
        }
        notifications = await InventoryNotification.getPayloadNotificationOnRecruiterAssigned(EntityTypes.JobOrder, jobOrder.id , jobOrder.recruiter_id, userId, notificationTypes.JobOrder.RecruiterAssigned);
      }else{
        notifications = await InventoryNotification.getPayloadNotificationOnRecruiterAssigned(EntityTypes.JobOrder, recruiterAssignment.job_order_id , recruiterAssignment.recruiter_id, userId, notificationTypes.JobOrder.RecruiterAssigned);
      } 
      const notificationPromises = notifications.map((notification) => NotificationService.sendNotificationToUsers(notification));
      await Promise.all(notificationPromises);
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
    }
  },
};


