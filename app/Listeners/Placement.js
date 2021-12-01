'use strict';
//Utils
const appInsights = require('applicationinsights');
const {
  SendoutStatusSchemes,
  EntityTypes,
  OperationType,
  CandidateStatusSchemes,
  JobOrderStatusSchemes,
  activityLogTypes,
  companyType,
  SendoutEventType
} = use('App/Helpers/Globals');
const { placementStatus } = use('App/Utils/PlacementUtils');
const { notificationTypes } = use('App/Notifications/Constants');
const NotificationService = use('Services/Notification');
const Database = use('Database');
const PlacementEmails = new (use('App/Emails/PlacementEmails'))();
const Env = use('Env');

//Repositories
const PlacementNotification = new (use('App/Notifications/PlacementNotification'))();
const SendoutRepository = new (use('App/Helpers/SendoutRepository'))();
const CandidateRepository = new (use('App/Helpers/CandidateRepository'))();
const PlacementRepository = new (use('App/Helpers/PlacementRepository'))();
const JobOrderRepository = new (use('App/Helpers/JobOrderRepository'))();
const CompanyRepository = new (use('App/Helpers/CompanyRepository'))();

//Models
const Sendout = use('App/Models/Sendout');
const JobOrder = use('App/Models/JobOrder');
const SendoutEventLog = use('App/Models/SendoutEventLog');

const Placement = (module.exports = {
  changeInventoryToPlacedOnApproved: async ({ placement = {}, successful_operation = true }) => {
    if (!successful_operation || placement.placement_status_id !== placementStatus.Pending_To_Invoiced._id) {
      return;
    }
    try {
      const sendout = await Sendout.findOrFail(placement.sendout_id);
      const { candidate_id, job_order_id } = sendout;
      await CandidateRepository.updateStatus(candidate_id, CandidateStatusSchemes.Placed);
      await JobOrderRepository.updateStatus(job_order_id, JobOrderStatusSchemes.Placed);
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
    }
  },

  changeSendoutToPlacedOnApproved: async ({ placement = {}, successful_operation = true, userId, previousStatusId }) => {
    if (!successful_operation || placement.placement_status_id === previousStatusId || placement.placement_status_id !== placementStatus.Pending_To_Invoiced._id) {
      return;
    }
    try {
      const sendoutId = placement.sendout_id;
      if(!sendoutId) throw new Error(`Sendout Fkey Missing ${JSON.stringify(placement)}`);
      await SendoutRepository.updateStatus(sendoutId, SendoutStatusSchemes.Placed, SendoutEventType.SendoutPlaced, userId);
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
    }
  },

  updateCompanyToClientIfApproved: async ({ placement, successful_operation = true }) => {
    if (!successful_operation || placement.placement_status_id !== placementStatus.Pending_To_Invoiced._id) {
      return;
    }
    try {
      const sendout = await Sendout.find(placement.sendout_id);
      const { job_order_id } = sendout;
      const { company_id } = await JobOrder.find(job_order_id);
      await CompanyRepository.updateType(company_id, companyType.Client);
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
    }
  },

  addActivityOnRelatedItems: async ({ placement, successful_operation = true, userId }) => {
    if (!successful_operation || placement.placement_status_id !== placementStatus.Pending_To_Invoiced._id) {
      return;
    }
    try {
      const activityMessage = `Added by Creating a 
      <a href="${Env.get('PUBLIC_URL_WEB')}/placements?id=${placement.id}">Placement</a>
      `;
      const sendout = await Sendout.find(placement.sendout_id);
      const { candidate_id, job_order_id } = sendout;
      await CandidateRepository.createActivityLog(
        activityMessage,
        activityLogTypes.OfferAccepted,
        candidate_id,
        userId,
        {
          createdBySystem: true,
          metadata: {
            placementId: placement.id
          }
        }
      );
      await JobOrderRepository.createActivityLog(
        activityMessage,
        activityLogTypes.OfferAccepted,
        job_order_id,
        userId,
        {
          createdBySystem: true,
          metadata: {
            placementId: placement.id
          }
        }
      );
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
    }
  },

  sendNotification: async ({ placementId, placement = {},  payload = {},  previousStatusId, successful_operation = true, userId }) => {
    if (!successful_operation || placement.placement_status_id === previousStatusId) {
      return;
    }
    try {
      let notifications = [];
      switch (placement.placement_status_id) {
        case placementStatus.Pending_To_Invoiced._id:
          notifications = await PlacementNotification.getPayloadNotificationOnApprove(
            placement,
            notificationTypes.Placement.Approved
          );
          break;

        case placementStatus.Pending_Update._id:
          notifications = await PlacementNotification.getPayloadNotificationOnSuggestionUpdate(
            placement,
            payload,
            notificationTypes.Placement.SuggestionUpdate
          );
          break;

        case placementStatus.Pending_Coach_Validation._id:
          case placementStatus.Pending_Regional_Validation._id:
            if (previousStatusId === placementStatus.Pending_Update._id) {
              notifications = await PlacementNotification.getPayloadNotificationOnUpdate(
                placement,
                notificationTypes.Placement.Updated
              );
            } else if(placement.placement_status_id === placementStatus.Pending_Coach_Validation._id){
              notifications = await PlacementNotification.getPayloadNotificationOnCreation(
                placement,
                notificationTypes.Placement.Created
              );
            }
          break;

        default:
          return;
      }

      const notificationPromises = notifications.map((notification) =>
        NotificationService.sendNotificationToUsers(notification)
      );
      await Promise.all(notificationPromises);
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
      Placement.logChange({
        placementId,
        entity: EntityTypes.Notification,
        operation: OperationType.Sent,
        payload: { exception: error.toString() },
        userId,
        successful_operation: false,
      });
    }
  },

  sendEmail: async ({ placementId, placement = {}, previousStatusId, successful_operation = true, operation ,userId, changes = {}, entity, payload }) => {
    if (!successful_operation) return;
    try {
      switch (operation) {
        case OperationType.Placement.MakeAdjustment:
          const { updated } = changes;
          await PlacementEmails.sendOnAdjustment(placement, updated);
          break;
      
        case OperationType.Create:
          if(entity === EntityTypes.Placement.Invoice){
            await PlacementEmails.sendOnInvoiceAdded(placement, payload);
          }else if(entity === EntityTypes.Placement.Payment){
            await PlacementEmails.sendOnPaymentAdded(placement, payload);
          }else if(entity === EntityTypes.Placement.default){
            await PlacementEmails.sendOnCreation(placement);
          }
          break;

        case OperationType.Placement.RevertFallOff:
          await PlacementEmails.sendOnRevertFallOffCompleted(placement);
          break;
      }
      if (placement.placement_status_id === previousStatusId || operation === OperationType.Placement.RevertFallOff) return;
      switch (placement.placement_status_id) {
        case placementStatus.Pending_To_Invoiced._id:
          await PlacementEmails.sendOnRegionalApproval(placement);
          break;

        case placementStatus.Pending_Update._id:
          await PlacementEmails.sendOnRequestUpdate(placement);
          break;
          
        case placementStatus.Pending_Coach_Validation._id:
          case placementStatus.Pending_Regional_Validation._id:
            if (previousStatusId === placementStatus.Pending_Update._id) {
              await PlacementEmails.sendOnUpdatedRequest(placement);
            }else if(placement.placement_status_id === placementStatus.Pending_Regional_Validation._id) {
              await PlacementEmails.sendOnCoachApproval(placement);
            }
          break;

        case placementStatus.Pending_To_FallOff._id:
          await PlacementEmails.sendOnFallOffRequest(placement);
        break;

        case placementStatus.FallOff._id:
            await PlacementEmails.sendOnFallOffCompleted(placement);
          break;

        case placementStatus.Pending_To_Revert_FallOff._id:
          await PlacementEmails.sendOnRevertFallOffRequest(placement);
        break;
        
        default:
          return;
      }
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
      Placement.logChange({
        placementId,
        entity: EntityTypes.Email,
        operation: OperationType.Sent,
        payload: { exception: error.toString() },
        userId,
        successful_operation: false,
      });
    }
  },

  addEmployeeIfApprove: async ({ placement = {}, successful_operation = true }) => {
    if (!successful_operation || placement.placement_status_id !== placementStatus.Pending_To_Invoiced._id) {
      return;
    }
    let trx;
    try {
      const sendout = await Sendout.find(placement.sendout_id);
      if (!sendout) return;
      const jobOrder = await sendout.joborder().fetch();
      trx = await Database.beginTransaction();
      await CandidateRepository.createEmployerRelationship(
        sendout.candidate_id,
        jobOrder.company_id,
        true,
        placement.created_by,
        trx
      );
      await trx.commit();
    } catch (error) {
      trx && (await trx.rollback());
      appInsights.defaultClient.trackException({ exception: error });
    }
  },

  logChange: async ({ placementId, entity, operation, payload, userId, successful_operation = true }) => {
    try {
      await PlacementRepository.logChange(placementId, entity, operation, payload, userId, successful_operation);
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
    }
  },

  updateFeeAmountSendout: async ({ placement = {}, successful_operation = true }) => {
    if(!successful_operation) return;
    try {
      const { fee_amount, sendout_id } = placement;
      await SendoutRepository.updateFeeAmount(fee_amount, sendout_id);
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
    }
  },

  postDealMessageIfApproved: async ({ placement, previousStatusId, successful_operation = true }) => {
    if (!successful_operation || placement.placement_status_id === previousStatusId || placement.placement_status_id !== placementStatus.Pending_To_Invoiced._id ) {
      return;
    }
    try {
      await PlacementRepository.postDealMessage(placement);
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
    }
  },
});
