'use strict';

//Repositories
const RecruiterRepository = new (use('App/Helpers/RecruiterRepository'))();
const CandidateRepository = new (use('App/Helpers/CandidateRepository'))();
const JobOrderRepository = new (use('App/Helpers/JobOrderRepository'))();

//Utils
const { notificationTypes, notificationCategories } = use('App/Notifications/Constants');
const { find, compact } = use('lodash');
const Env = use('Env');

class CandidateAndJobMatchNotification {
  /**
   *
   * @param {Integer} dataId
   * @param {Integer} type
   *
   * @return {Object}
   */
  async getPayloadNotificationOnMatch(candidate_id, job_order_id, type) {
    let entytyId;
    let recruiterMatchId;
    let recruiterMatchTitle;
    const candidate = await CandidateRepository.details(candidate_id, 'compact');
    const jobOrder = await JobOrderRepository.details(job_order_id, 'compact');
    if (!candidate || !jobOrder) {
      return [];
    }

    const candidateRecruiterId = candidate.recruiter.id;
    const jobRecruiterId = jobOrder.recruiter.id;
    const candidateTitle = candidate.personalInformation.full_name;
    const jobOrderTitle = jobOrder.title;

    switch (type) {
      case notificationTypes.Candidate.JobOrderMatched:
        entytyId = candidate.id;
        recruiterMatchId = jobRecruiterId;
        recruiterMatchTitle = candidate.recruiter.personalInformation.full_name;
        break;
      case notificationTypes.JobOrder.CandidateMatched:
        entytyId = jobOrder.id;
        recruiterMatchId = candidateRecruiterId;
        recruiterMatchTitle = jobOrder.recruiter.personalInformation.full_name;
        break;
    }

    const notificationData = {
      id: entytyId,
      recruiter: recruiterMatchTitle,
      candidateTitle,
      jobOrderTitle,
      type,
    };

    const notification = this.buildMatchNotifications(notificationData);

    const coachCandidate = await RecruiterRepository.getCoachByRecruiterId(candidateRecruiterId);
    const regionalCandidate = await RecruiterRepository.getRegionalByCoachId(coachCandidate);

    const coachJob = await RecruiterRepository.getCoachByRecruiterId(jobRecruiterId);
    const regionalJob = await RecruiterRepository.getRegionalByCoachId(coachJob);

    const recruiter = candidateRecruiterId === jobRecruiterId ? null : recruiterMatchId;

    const isDiffCoach = coachCandidate != coachJob;
    const isDiffRegional = regionalCandidate != regionalJob;

    const notifications = [
      //Recruiter from JobOrder
      recruiter
        ? {
            userIds: recruiter,
            ...notification.Recruiter,
          }
        : null,
      //Coach from Candidate
      coachCandidate && coachCandidate != candidateRecruiterId && coachCandidate != jobRecruiterId
        ? {
            userIds: coachCandidate,
            ...notification.Coach,
          }
        : null,
      //Coach from jObOrder
      coachJob && isDiffCoach && coachJob != candidateRecruiterId && coachJob != jobRecruiterId
        ? {
            userIds: coachJob,
            ...notification.Coach,
          }
        : null,
      //Regional from Candidate
      regionalCandidate && regionalCandidate != candidateRecruiterId && regionalCandidate != jobRecruiterId
        ? {
            userIds: regionalCandidate,
            ...notification.Regional,
          }
        : null,
      //Regional from Job Order
      regionalJob && isDiffRegional && regionalJob != candidateRecruiterId && regionalJob != jobRecruiterId
        ? {
            userIds: regionalJob,
            ...notification.Regional,
          }
        : null,
    ];

    return compact(notifications);
  }

  /**
   *
   * @param {Integer} id
   * @param {String} userEventTitle
   * @param {String} candidateTitle
   * @param {String} jobOrderTitle
   * @param {String} type
   *
   *
   * @return {Object}
   */
  buildMatchNotifications(notification) {
    const { id, recruiter, candidateTitle, jobOrderTitle, type } = notification;

    const options = this.getNotificationOptions(id, type);

    const items = {
      Regional: {
        payload: {
          data: {
            title: `New Match from ${recruiter}!`,
            body: `Candidate: ${candidateTitle} with JO: ${jobOrderTitle}.`,
            ...options,
          },
        },
      },
      Coach: {
        payload: {
          data: {
            title: `New Match from ${recruiter}!`,
            body: `Candidate: ${candidateTitle} with JO: ${jobOrderTitle}.`,
            ...options,
          },
        },
      },
      Recruiter: {
        payload: {
          data: {
            title: `New Match from ${recruiter}!`,
            body: `Candidate: ${candidateTitle} with JO: ${jobOrderTitle}.`,
            ...options,
          },
        },
      },
    };

    return items;
  }

  /**
   *
   * @param {Integer} id
   * @param {Integer} type
   *
   * @return {Object}
   */
  getNotificationOptions(id, type) {
    const urlOptions = {
      JobOrderMatchCandidate: {
        click_url: `${Env.get('PUBLIC_URL_WEB')}/joborders/profile/${id}?tab=candidates`,
        click_action: `/joborders/profile/${id}?tab=candidates`,
      },
      CandidateMatchJobOrder: {
        click_url: `${Env.get('PUBLIC_URL_WEB')}/candidates/profile/${id}?tab=joborders`,
        click_action: `/candidates/profile/${id}?tab=joborders `,
      },
    };

    const options = [
      //Job Order Notification Format
      {
        notificationType: notificationTypes.JobOrder.CandidateMatched,
        format: {
          icon: 'statusInventoryItemNotificationIcon',
          color: '#4056F4',
          ...urlOptions.JobOrderMatchCandidate,
        },
      },
      //Candidate Notification Format
      {
        notificationType: notificationTypes.Candidate.JobOrderMatched,
        format: {
          icon: 'statusInventoryItemNotificationIcon',
          color: '#4056F4',
          ...urlOptions.CandidateMatchJobOrder,
        },
      },
    ];
    const optionItem = find(options, { notificationType: type });
    if (!optionItem) {
      throw 'NotificationOptionNotFound';
    }
    return {
      ...optionItem.format,
      type: notificationCategories.INVENTORY
    };
  }
}

module.exports = CandidateAndJobMatchNotification;
