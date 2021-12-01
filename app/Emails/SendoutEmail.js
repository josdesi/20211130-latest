'use strict';

// Utils
const appInsights = require('applicationinsights');
const SendgridService = use('Services/Sendgrid');
const Drive = use('Drive');
const ics = require('ics');
const { v4: uuidv4 } = require('uuid');
const Env = use('Env');
const moment = require('moment');
const Helpers = use('Helpers');

// Repositories
const JobOrderRepository = new (use('App/Helpers/JobOrderRepository'))();
const CandidateRepository = new (use('App/Helpers/CandidateRepository'))();
const SendgridConfigurationRepository = new (use('App/Helpers/SendgridConfigurationRepository'))();

// Helpers and Utils
const {
  DefaultEmailSendouts,
  addRecruiterSignatureEmail,
  getCcEmails,
  getBccEmails,
  getindustryEmails,
  getTeamEmails,
  getRecruiterEmails,
  getTestEmails,
} = use('App/Utils/Sendouts');
const { DateFormats, SendoutTypesEmails } = use('App/Helpers/Globals');
const { streamToString, getMIMEType } = use('App/Helpers/FileHelper');
const MicrosoftGraph = new (use('App/Helpers/MicrosoftGraph'))();

class SendoutEmail {
  constructor() {
    this.usingOutlookAsEmailProvider = Env.get('SENDOUT_EMAIL_PROVIDER') === 'OUTLOOK';
    this.shouldSendProductionEmails = Env.get('SENDOUT_EMAIL') === 'prod' || Env.get('REMINDER_SENDOUT') === 'prod';
  }

  /**
   *
   * @param {Object} emailData
   * @param {Array} interviews
   * @param {Array} attachments
   * @returns
   */
  async createAndSendEmailToHiringAuthority(
    {
      jobOrderId,
      candidateId,
      jobOrderAccountableId,
      candidateAccountableId,
      hiringAuthority,
      ccEmails,
      bccEmails,
      subject,
      template,
      userId,
    },
    interviews,
    attachments
  ) {
    const SendoutRepository = new (use('App/Helpers/SendoutRepository'))();

    const isOnBehalf = userId !== jobOrderAccountableId;
    const currentUserId = isOnBehalf ? userId : jobOrderAccountableId;

    const jobOrder = await JobOrderRepository.getJobOrderForSendout(jobOrderId);
    const candidate = await CandidateRepository.getCandidateForSendout(candidateId);

    const jobOrderAccountable = await SendoutRepository.getAccountableAndCoach(jobOrderAccountableId);
    const candidateAccountable = await SendoutRepository.getAccountableAndCoach(candidateAccountableId);

    const body = addRecruiterSignatureEmail(
      template,
      jobOrderAccountable.recruiter.email_signature || jobOrderAccountable.recruiter.full_name
    );
    const toEmail = hiringAuthority.work_email || hiringAuthority.personal_email;
    const cc = getCcEmails(ccEmails, toEmail);

    const recruiterEmails = getRecruiterEmails(jobOrderAccountable.recruiter, candidateAccountable.recruiter);
    const teamEmails = getTeamEmails(jobOrderAccountable.coach, candidateAccountable.coach);
    const industryEmails = getindustryEmails(jobOrder, candidate);

    const bcc = getBccEmails([...recruiterEmails, ...teamEmails, ...industryEmails, ...bccEmails], cc);

    const baseContentEmail = {
      subject,
      body,
    };

    const distributionEmails = {
      to: toEmail,
      cc: cc,
      bcc: bcc,
      ...baseContentEmail,
    };

    const distributionTestEmails = {
      to: DefaultEmailSendouts.TestTo,
      cc: getTestEmails(ccEmails, DefaultEmailSendouts.TestTo),
      bcc: getTestEmails(bccEmails, DefaultEmailSendouts.TestTo),
      ...baseContentEmail,
    };

    const payload = this.shouldSendProductionEmails ? distributionEmails : distributionTestEmails;

    const newAttachments = attachments && !!attachments.length ? await this.getAttachments(attachments) : [];

    if (interviews && !!interviews.length) {
      const invite = await this.getCalendarInvite(jobOrder, candidate, interviews[0]);
      invite && newAttachments.push(invite);
    }

    const emailData = this.getEmailData(payload, isOnBehalf, jobOrderAccountable, newAttachments, currentUserId);

    const resposeEmail = this.usingOutlookAsEmailProvider
      ? await this.sendEmailWithOutlook(emailData)
      : await this.sendEmailWithSendgrid(emailData);

    return resposeEmail;
  }

  /**
   *
   * @param {*} payload
   * @param {*} isOnBehalf
   * @param {*} jobOrderAccountable
   * @param {*} newAttachments
   * @param {*} currentUserId
   * @returns
   */
  getEmailData(payload, isOnBehalf, jobOrderAccountable, newAttachments, currentUserId) {
    return this.usingOutlookAsEmailProvider
      ? {
          to: [payload.to],
          cc: payload.cc,
          bcc: payload.bcc,
          subject: payload.subject,
          onBehalfEmail: isOnBehalf ? jobOrderAccountable.recruiter.email : null,
          content: payload.body,
          attachments: {
            raw: newAttachments,
          },
          userId: currentUserId,
        }
      : {
          to: payload.to,
          cc: payload.cc,
          bcc: payload.bcc,
          subject: payload.subject,
          from: {
            name: jobOrderAccountable.recruiter.full_name,
            email: jobOrderAccountable.recruiter.email,
          },
          body: payload.body,
          attachments: newAttachments,
        };
  }

  /**
   *
   * @param {Object} emailData
   * @returns
   */
  async sendEmailWithOutlook(emailData) {
    const { to, cc, bcc, onBehalfEmail, subject, content, attachments, userId } = emailData;

    if (Helpers.isAceCommand()) {
      return {
        success: true,
      };
    }

    try {
      const body = {
        contentType: 'Html',
        content,
      };
      const recipientData = {
        recipients: to,
        ccRecipients: cc,
        bccRecipients: bcc,
      };
      const messageData = {
        subject,
        body,
      };
      const config = {
        saveToSentItems: 'true',
      };

      if (onBehalfEmail) config.onBehalf = onBehalfEmail;

      const responseEmail = await MicrosoftGraph.sendEmail(recipientData, messageData, config, userId, attachments);

      if (!responseEmail.success) {
        const { success, message, code = null, statusCode = null } = responseEmail;
        return {
          success,
          code: code || statusCode,
          message,
        };
      }
      return {
        success: true,
      };
    } catch (error) {
      const properties = {
        error,
        payload: {
          recipients,
          ccRecipients,
          bccRecipients,
          subject,
          content,
          userId,
          attachments,
        },
      };
      appInsights.defaultClient.trackEvent({ name: 'Sendout Send Email Failed', properties });

      appInsights.defaultClient.trackException({
        exception: error,
      });
      return {
        success: false,
        code: 500,
        message: error,
      };
    }
  }

  /**
   *
   * @param {Object} emailData
   * @returns
   */
  async sendEmailWithSendgrid(emailData) {
    const { to, cc, bcc, from, subject, body, attachments } = emailData;

    if (Helpers.isAceCommand()) {
      return {
        success: true,
      };
    }

    try {
      const baseMessage = {
        to: to,
        cc: cc,
        bcc: bcc,
        from: from,
        subject,
        html: body,
      };

      const messageData =
        attachments && !!attachments.length
          ? {
              ...baseMessage,
              attachments,
            }
          : {
              ...baseMessage,
            };

      const responseEmail = (await SendgridService.send(messageData))[0];

      if (responseEmail && responseEmail.statusCode !== 202) {
        const { success, message, code = null, statusCode = null } = responseEmail;
        return {
          success,
          code: code || statusCode,
          message,
        };
      }
      return {
        success: true,
      };
    } catch (error) {
      const properties = {
        error,
        ...emailData,
      };
      appInsights.defaultClient.trackEvent({ name: 'Sendout Send Email Failed', properties });

      appInsights.defaultClient.trackException({
        exception: error,
      });
      return {
        success: false,
        code: 500,
        message: error,
      };
    }
  }

  /**
   *
   * @param {Object} jobOrder
   * @param {Object} candidate
   * @param {Object} interview
   * @returns Invite to calendar
   */
  async getCalendarInvite(jobOrder, candidate, interview) {
    let invite = {};
    const tz = moment.tz.guess();
    const interviewDate = moment
      .tz(interview.interview_date, interview.interview_time_zone)
      .format(DateFormats.AgendaFormat);
    const currenDateTz = moment(interviewDate).tz(tz).format('YYYY-M-D-H-m').split('-');
    const startDate = currenDateTz.map((i) => Number(i));

    if (!interview.interview_range) {
      const invitationData = {
        title: `Candidate Interview ${candidate.full_name}`,
        description: `Interview with ${candidate.full_name} for the ${jobOrder.title} position.`,
        date: startDate,
      };

      const result = await this.createCalendarInvite(invitationData);

      if (!result.success) {
        return {
          success: false,
          message: result.message,
        };
      }

      const baseAttachment = {
        name: 'invite.ics',
        contentId: uuidv4(),
      };

      const contentFile = Buffer.from(result.data).toString('base64');

      if (this.usingOutlookAsEmailProvider) {
        invite = {
          contentBytes: contentFile,
          contentType: 'application/ics',
          ...baseAttachment,
        };
      } else {
        invite = {
          filename: 'invite.ics',
          content: contentFile,
          disposition: 'attachment',
          type: 'application/ics',
          ...baseAttachment,
        };
      }
    }

    return invite;
  }

  /**
   *
   * @param {Object} Invite
   * @returns {Object} Invite to calendar
   */
  createCalendarInvite({ title, description, date }) {
    return new Promise(function (resolve, reject) {
      return ics.createEvent(
        {
          start: date,
          duration: {
            hours: 1,
          },
          title: title,
          description: description,
          status: 'CONFIRMED',
          busyStatus: 'BUSY',
        },
        (error, value) => {
          if (error) {
            appInsights.defaultClient.trackException({
              exception: error,
            });
            resolve({
              success: false,
              message: 'Unexpected error while creating invitation to calendar',
            });
          }
          resolve({
            success: true,
            data: value,
          });
        }
      );
    });
  }

  /**
   *
   * @param {Array} attachments
   * @returns {Array} attachments to email
   */
  async getAttachments(attachments) {
    try {
      const newAttachments = [];
      for (const attachment of attachments) {
        const pathFile = attachment.url.split('/files/');

        if (pathFile.length <= 0) continue;

        const path = pathFile[1];
        const decodedPath = decodeURIComponent(path);

        if (await Drive.disk('azure').exists(decodedPath)) {
          const stream = (await Drive.disk('azure').getStream(decodedPath)).readableStreamBody;
          stream.setEncoding('base64');
          const base64String = await streamToString(stream);

          if (this.usingOutlookAsEmailProvider) {
            newAttachments.push({
              contentBytes: base64String,
              contentType: getMIMEType(attachment.file_name),
              name: attachment.file_name,
            });
          } else {
            newAttachments.push({
              content: base64String,
              filename: attachment.file_name,
              type: getMIMEType(attachment.file_name),
              disposition: 'attachment',
            });
          }
        }
      }

      return newAttachments;
    } catch (error) {
      appInsights.defaultClient.trackException({
        exception: error,
      });

      return {
        success: false,
      };
    }
  }

  async sendPersonalizedEmail(payload, type) {
    try {
      const personalizations = this.buildEmailPersonalizations(payload, type);
      const sendgridPayload = await this.buildSendgridNotificationPayload(personalizations, type);

      return await SendgridService.send(sendgridPayload);
    } catch (error) {
      appInsights.defaultClient.trackException({
        exception: error,
      });
    }
  }

  buildEmailPersonalizations(payload, type) {
    let dynamicTemplate = {
      date: payload.date,
      timezone: payload.timezone,
      interview_type: payload.interview_type,
      joborder: payload.joborder,
      company: payload.company,
      hiring: payload.hiring_authority,
      candidate: payload.candidate,
      recruiter: payload.recruiter,
      coach: payload.coach,
      company_recruiter: payload.company_recruiter,
      company_recruiter_initials: payload.company_recruiter_initials,
      company_coach: payload.company_coach,
      candidate_recruiter: payload.candidate_recruiter,
      candidate_recruiter_initials: payload.candidate_recruiter_initials,
      candidate_coach: payload.candidate_coach,
      subject: payload.subject,
    };

    let res;

    const basePayload = {
      to: payload.to,
      dynamic_template_data: dynamicTemplate,
    };

    if (type === SendoutTypesEmails.Sendout) {
      res = payload.cc
        ? {
            ...basePayload,
            cc: payload.cc,
          }
        : basePayload;
    } else if (type === SendoutTypesEmails.SendoutNotification || type === SendoutTypesEmails.SendoverNotification) {
      res = payload.bcc
        ? {
            ...basePayload,
            bcc: payload.bcc,
          }
        : basePayload;
    }

    return res;
  }

  async buildSendgridNotificationPayload(personalizations, type) {
    const SendgridConfiguration = await SendgridConfigurationRepository.getByType(type);

    if (!SendgridConfiguration) {
      throw `Sendgrid configuration not found: ${type}`;
    }

    return {
      ...personalizations,
      from: SendgridConfiguration.sender,
      templateId: SendgridConfiguration.template_id,
    };
  }
}

module.exports = SendoutEmail;
