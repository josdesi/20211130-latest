'use strict';
//Utils
const appInsights = require('applicationinsights');
const { CandidateTypeSchemes, EntityTypes, OperationType, AdditionalRecruiterStatus, AdditionalRecruiterTypes, DateFormats, activityLogTypes } = use('App/Helpers/Globals');
const Agenda = use('Services/Agenda');
const { JobNames } = use('App/Scheduler/Constants');
const OperatingMetricConfiguration = use('App/Models/OperatingMetricConfiguration');
const { notificationTypes } = use('App/Notifications/Constants');
const NotificationService = use('Services/Notification');
const CandidateDirectoryUpdater = new (use('App/Helpers/CandidateDirectoryUpdater'))();
const { every } = use('lodash');
const moment = use('moment');
//Repositories
const InventoryNotification = new (use('App/Notifications/InventoryNotifications'))();
const CandidateAndJobMatchNotification = new (use('App/Notifications/CandidateAndJobMatchNotification'))();
const OperatingNotification = new (use('App/Notifications/OperatingNotifications'))();
const CandidateRepository = new (use('App/Helpers/CandidateRepository'))();
const RequestAdditionalRecruiterNotifications = new (use('App/Notifications/RequestAdditionalRecruiterNotifications'))();
const extractId = ({id, candidateId, candidate}) => {
  if (id) return id;
  if (candidateId) return candidateId;
  if (candidate && candidate.id) return candidate.id;
};
const Candidate = module.exports = {
    /**
   * @deprecated  
   * Schedule the jobs for the
   * operating candidate metrics
   *
   * @method scheduleMetricJobs
   *
   * @param {Integer} candidateId
   *
   */
  scheduleMetricJobs: async ({candidateId, userId}) => {
    const templateMetrics = await OperatingMetricConfiguration.findBy('entity', EntityTypes.Candidate);
    const operatingMetrics = await CandidateRepository.getCurrentOperating(candidateId,userId);
    const metricFrequency =  (templateMetrics && templateMetrics.metric_frequency) || '72 hours';
    const reminderFrequency = (templateMetrics && templateMetrics.reminder_frequency) || '1 days and 10 minutes';
    const timeBeforeRenew = (templateMetrics && templateMetrics.before_metric_renew) || '12 hours';
    const [duration , time ] = timeBeforeRenew.split(' ');
    const beforeRenewDate = moment(operatingMetrics.end_date).subtract(Number(duration),time).format(DateFormats.AgendaFormat);
    try {
      const data = {
        entityType: EntityTypes.Candidate,
        id: Number(candidateId),
        userId
      };
      await Agenda.create(JobNames.Candidates.OperatingReminders, data)
        .repeatEvery(reminderFrequency,{
          skipImmediate: true 
        })
        .save();

      await Agenda.create(JobNames.Candidates.OperatingMetrics, data)
        .repeatEvery(metricFrequency,{
          skipImmediate: true
        })
        .save();  

      await Agenda.create(JobNames.Candidates.BeforeOperatingRenew, data)
          .schedule(beforeRenewDate)
          .save();
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
    }
  },


    /**
   * @deprecated  
   * Stop the jobs for an
   * operting candidate metrics
   *
   * @method stopMetricJobs
   *
   * @param {Integer} candidateId
   *
   */
  stopMetricJobs: async ({candidateId ,userId}) => {
    try {
      let cancelPayload = {
        'data.id': candidateId,
        'data.entityType': EntityTypes.Candidate,
      };
      if(Number.isFinite(userId)){
        cancelPayload = {
          ...cancelPayload,
          'data.userId': userId
        }
      }
      await Agenda.cancel({
        name: JobNames.Candidates.OperatingReminders,
        ...cancelPayload
      });
      await Agenda.cancel({
        name: JobNames.Candidates.OperatingMetrics,
        ...cancelPayload
      });
      await Agenda.cancel({
        name: JobNames.Candidates.BeforeOperatingRenew,
        ...cancelPayload
      });
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
    }
  },

  /**
   * @deprecated  
   * Generates the operationg metrics for the
   * created candidated
   *
   * @method initializeOperationMetric
   *
   * @param {Object} candidate
   *
   */
  initializeOperationMetric: async ({candidate = {}, additionalRecruiter = {}}) => {
    try {
      const candidateId = candidate.id || additionalRecruiter.candidate_id;
      const {  type : additionalRecruiterType = null } = additionalRecruiter;
      const userId = additionalRecruiterType === AdditionalRecruiterTypes.Accountable ? additionalRecruiter.recruiter_id : candidate.recruiter_id;
      const isAnOngoingItem = await CandidateRepository.isAnOngoingItem(candidateId);
      if(!isAnOngoingItem){
        return;
      }
      await CandidateRepository.initializeOperatingMetrics(candidateId, userId);
      await Candidate.scheduleMetricJobs({candidateId, userId});
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
      const notifications = await OperatingNotification.getPayloadNotificationOnOperatingCompleted(operatingMetric.candidate_id, notificationTypes.Candidate.OperatingMetricCompleted, operatingMetric.created_by);

      const notificationPromises = notifications.map((notification) => NotificationService.sendNotificationToUsers(notification));
      await Promise.all(notificationPromises);
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
    }
  },


  notifyOnCreation: async ({candidate}) => {
    try {
      const notifications = await InventoryNotification.getPayloadNotificationOnCreation(candidate.id, notificationTypes.Candidate.Created);

      notifications.map(async (notification) => {
        await NotificationService.sendNotificationToUsers(notification);
      });
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
    }
  },


  notifyOnStatusUpdate: async ({blueSheet, userId, previousCandidateTypeId}) => {
    try {
      const newTypeId = blueSheet.candidate_type_id;
      if(newTypeId === previousCandidateTypeId || ( newTypeId !== CandidateTypeSchemes.Alpha && newTypeId !== CandidateTypeSchemes.Poejo)){
        return null;
      }
      const notifications = await InventoryNotification.getPayloadNotificationOnStatusUpdate(blueSheet.candidate_id, notificationTypes.Candidate.StatusUpdated, userId);

      const notificationPromises = notifications.map((notification) => NotificationService.sendNotificationToUsers(notification));
      await Promise.all(notificationPromises);
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
    }
  },

  /**
   * Evaluate the metrics when the
   * bluesheet is updated
   *
   * @method evaluateStatusForMetrics
   *
   * @param {Integer} candidateId
   * @param {Integer} userId
   * @param {Integer} previousCandidateTypeId
   */
  evaluateStatusForMetrics: async ({candidateId, userId, previousCandidateTypeId}) => {
    try {
      if(!await CandidateRepository.isARecruiterOnTheCandidate(candidateId ,userId) && !await CandidateRepository.isACoachOnTheCandidate(candidateId ,userId)){
        return null;
      }
      await CandidateRepository.evaluateMetricsWhenStatusChange(candidateId, previousCandidateTypeId, userId);
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
    }
  },

    /**
   * Fires the notification when a candidate
   * is matched with a job order
   *
   * @method notifyMatchWithJobOrder
   *
   * @param {Object} jobOrderCandidateMatch
   */
  notifyMatchWithJobOrder: async ({candidateJobOrderMatch}) => {
    try {
      const { candidate_id,job_order_id } = candidateJobOrderMatch;
      const notifications = await CandidateAndJobMatchNotification.getPayloadNotificationOnMatch(candidate_id, job_order_id, notificationTypes.Candidate.JobOrderMatched);

      notifications.map(async (notification) => {
        await NotificationService.sendNotificationToUsers(notification);
      });
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
    }
  },
  /**
   *
   * @method logChange
   *
   * @param {object} candidateId
   * @param {integer} userId
   * @param {string} operation
   * @param {object} payload
   * @param {integer} userId

   */
  logChange: async ({candidateId, entity, operation, payload, userId, successful_operation = true}) => {
    try {
      await CandidateRepository.logChange(candidateId, entity, operation, payload, userId, successful_operation);
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
    }
  },    

  /**
   *
   * @method logTypeUpdate
   *
   * @param {Object} blueSheet
   * @param {Integer} userId
   * @param {Integer} previousCandidateTypeId
   */
  logBluesheetUpdate: async ({ blueSheet = {}, userId, previousCandidateTypeId }) => {
    try {
      const { candidate_type_id: newTypeId = null, candidate_id } = blueSheet;
      if(newTypeId  !== previousCandidateTypeId ){
        await CandidateRepository.logStatusChange(candidate_id, newTypeId, userId);
      }
      await CandidateRepository.logChange(candidate_id, EntityTypes.Bluesheet, OperationType.Update, blueSheet, userId);
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
      const { candidate_id, recruiter_id, status, type } = additionalRecruiter;
      if (status !== AdditionalRecruiterStatus.Approved) {
        return null;
      }
      const notifications = await RequestAdditionalRecruiterNotifications.getPayloadNotificationRequestRecruiter(
        candidate_id,
        recruiter_id,
        userId,
        notificationTypes.Candidate.AdditionalRecruiterRequested,
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
      const { candidate_id, recruiter_id, type } = additionalRecruiter;
      const notifications = await RequestAdditionalRecruiterNotifications.getPayloadNotificationOnRemoveRecruiter(
        candidate_id,
        recruiter_id,
        userId,
        notificationTypes.Candidate.AdditionalRecruiterRemoved,
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
   * @method evaluateFreeGame
   *
   * @param {Object} candidate
   */
  evaluateFreeGame: async ({ candidateId, shouldEvaluateFreeGame=true }) => {
    try {
      if(!candidateId){
        return null;
      }
      shouldEvaluateFreeGame && await CandidateRepository.markCandidatesFreeGame({ candidateId: Number(candidateId) });
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
    }
  }, 
  /**
   *
   * @method logAssignment
   *
   * @param {object} candidateId
   * @param {integer} userId
   * @param {string} operation
   * @param {object} payload
   * @param {integer} userId

   */
  logAssignment: async ({additionalRecruiter, action, userId}) => {
    try {
      await CandidateRepository.logAssignment(additionalRecruiter, action, userId);
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
    }
  },    

    /**
   * @deprecated  
   * 
   * @method initializeMetricsOnRecruiterReassign 
   *
   * @param {Object} recruiterAssignment
   * @param {Integer} previousRecruiterId
   */
  initializeMetricsOnRecruiterReassign: async ({ recruiterAssignment, previousRecruiterId }) => {
    try {
      const { candidate_id, recruiter_id } = recruiterAssignment;
      await Candidate.stopMetricJobs({candidateId: candidate_id, userId: previousRecruiterId});
      const operatingMetric = await CandidateRepository.initializeOperatingMetrics(candidate_id, recruiter_id);
      if(!operatingMetric){
        appInsights.defaultClient.trackException({ exception: `The Operating for the candidate <${candidate_id}> on the user <${recruiter_id}> couldn't be created` });
      }
      await Candidate.scheduleMetricJobs({candidateId:operatingMetric.candidate_id, userId:operatingMetric.created_by});
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
      const { candidate_id, recruiter_id, type } = additionalRecruiter;
      if(additionalRecruiter && type === AdditionalRecruiterTypes.Accountable){
        await Candidate.stopMetricJobs({candidateId: candidate_id, userId: recruiter_id});
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
  notifyOnRecruiterAssigned: async ({candidate , recruiterAssignment, userId}) => {
    try {
      let notifications;
      if(candidate){
        if(candidate.recruiter_id===userId){ 
          return null; 
        }
        notifications = await InventoryNotification.getPayloadNotificationOnRecruiterAssigned(EntityTypes.Candidate, candidate.id , candidate.recruiter_id, userId, notificationTypes.Candidate.RecruiterAssigned);
      }else{
        notifications = await InventoryNotification.getPayloadNotificationOnRecruiterAssigned(EntityTypes.Candidate, recruiterAssignment.candidate_id , recruiterAssignment.recruiter_id, userId, notificationTypes.Candidate.RecruiterAssigned);
      } 
      const notificationPromises = notifications.map((notification) => NotificationService.sendNotificationToUsers(notification));
      await Promise.all(notificationPromises);
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
    }
  },

  updateActivityTableThenDirectory: async (params) => {
    try {
      const id = extractId(params);
      await CandidateRepository.refreshLastActivityDateTableById(id);
      await Candidate.updateOrCreateDirectoryInformation(params);
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
    }
  },

  updateBatchActivityTableThenDirectory: async ({ candidateIds = 0 }) => {
    try {
      if (candidateIds.length <= 0) return;
      await CandidateRepository.refreshLastActivityDateTableByBatchIds(candidateIds);
      await Candidate.updateOrCreateDirectoryInformation({ candidateIds });
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
    }
  },

  updateOrCreateDirectoryInformation: async(params) => {
    try {
      const { candidateIds = [] } = params;
      const id = extractId(params);
      if (!id && candidateIds.length === 0) return;
      if(id) await CandidateDirectoryUpdater.updateOrCreateDirectoryInformation(id);
      if(candidateIds.length > 0){
        for(const _id of candidateIds){
          await CandidateDirectoryUpdater.updateOrCreateDirectoryInformation(_id);
        }
      }
    } catch(error) {
      appInsights.defaultClient.trackException({ exception: error });
    }
  },

  updateReferenceSentDate: async({ candidateId, lastSentReferenceDate, successful_operation = true }) => {
    if(!successful_operation){
      return;
    }
    try {
      await CandidateRepository.updateReferenceSentDate(candidateId, lastSentReferenceDate);
    } catch(error) {
      appInsights.defaultClient.trackException({ exception: error });
    }
  },

  addReferenceReleaseActivity: async ({ candidateId, successful_operation = true, userId }) => {
    if (!successful_operation) {
      return;
    }
    try {
      const activityMessage = `Reference Release Sent!`;
      await CandidateRepository.createActivityLog(
        activityMessage,
        activityLogTypes.ReferencesReleaseFormSent,
        candidateId,
        userId,
        {
          createdBySystem: true,
          metadata: {
            candidateId
          }
        }
      );
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
    }
  },
};

