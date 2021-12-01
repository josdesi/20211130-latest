'use strict';

// Utils
const appInsights = require('applicationinsights');
const SendgridService = use('Services/Sendgrid');
const Drive = use('Drive');
const Mime = require('mime-types');
const ics = require('ics');
const { v4: uuidv4 } = require('uuid');

const { SendoutTypesEmails } = use('App/Helpers/Globals');

const SendgridConfigurationRepository = new (use('App/Helpers/SendgridConfigurationRepository'))();

class SendoutEmail {
  async sendEmail(payload, attachments) {
    try {
      let newAttachments = [];

      if (attachments && !!attachments.length) {
        newAttachments = await this.getAttachments(attachments);
      }

      if (payload && payload.invite) {
        const invite = await this.generateInviteToCalendar(payload.invite);

        if (invite && invite.status) {
          const attachmentICS = {
            filename: 'invite.ics',
            name: 'invite.ics',
            content: Buffer.from(invite.data).toString('base64'),
            disposition: 'attachment',
            contentId: uuidv4(),
            type: 'application/ics'
          };

          newAttachments.push(attachmentICS);
        }
      }

      const msg = this.buildSendEmail(payload, newAttachments);

      return await SendgridService.send(msg);
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
    }
  }

  async sendPersonalizedEmail(payload, type) {
    try {
      const personalizations = this.buildEmailPersonalizations(payload, type);
      const sendgridPayload = await this.buildSendgridNotificationPayload(personalizations, type);

      return await SendgridService.send(sendgridPayload);
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
    }
  }

  generateInviteToCalendar({ title, description, date }) {
    return new Promise(function (resolve, reject) {
      return ics.createEvent({
        start: date,
        duration: { hours: 1 },
        title: title,
        description: description,
        status: 'CONFIRMED',
        busyStatus: 'BUSY',
      }, (error, value) => {
        if (error) {
          appInsights.defaultClient.trackException({ exception: error });
          resolve({ status: false, error: error })
        }
        resolve({ status: true, data: value })
      })
    });
  }

  async getAttachments(rawAttachments) {
    try {
      const attachments = [];
      for (const rawAttachment of rawAttachments) {
        const pathFile = rawAttachment.url.split('/files/');

        if (pathFile.length <= 0) continue;

        const path = pathFile[1];

        const decodedPath = decodeURIComponent(path);

        if (await Drive.disk('azure').exists(decodedPath)) {
          const stream = (await Drive.disk('azure').getStream(decodedPath)).readableStreamBody;
          stream.setEncoding('base64');

          const base64String = await this.streamToString(stream);

          attachments.push({
            content: base64String,
            filename: rawAttachment.file_name,
            type: this.getMIMEType(rawAttachment.file_name),
            disposition: 'attachment',
          });
        }
      }

      return attachments;
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
    }
  }

  async streamToString(stream) {
    let string = '';
    for await (const chunk of stream) {
      string += chunk;
    }
    return string;
  }

  getMIMEType(filename) {
    return Mime.lookup(filename) || 'application/octet-stream';
  }

  buildSendEmail(payload, attachments) {
    return attachments && !!attachments.length ? {
      ...payload,
      attachments
    } : {
      ...payload
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
      subject: payload.subject
    };

    let res;

    const basePayload = { to: payload.to, dynamic_template_data: dynamicTemplate };

    if (type === SendoutTypesEmails.Sendout) {
      res = payload.cc ? { ...basePayload, cc: payload.cc } : basePayload;
    } else if (type === SendoutTypesEmails.SendoutNotification || type === SendoutTypesEmails.SendoverNotification) {
      res = payload.bcc ? { ...basePayload, bcc: payload.bcc } : basePayload;
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
      templateId: SendgridConfiguration.template_id
    };
  }
}

module.exports = SendoutEmail;
