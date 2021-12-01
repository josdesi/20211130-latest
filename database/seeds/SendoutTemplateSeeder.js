'use strict';

/*
|--------------------------------------------------------------------------
| SendoutTemplateSeeder
|--------------------------------------------------------------------------
|
| Make use of the Factory instance to seed database with dummy data or
| make use of Lucid models directly.
|
*/

/** @type {import('@adonisjs/lucid/src/Factory')} */

// Seeder
const { SendoutTypesSchemes } = use('App/Helpers/Globals');

// Models
const SendoutTemplate = use('App/Models/SendoutTemplate');

class SendoutTemplateSeeder {
  static async run(trx) {
    const templateSendout = `
    company_name
    hiring_authority_full_name

    hiring_authority_name,
    Per our ____, this is the interview confirmation for candidate_full_name, for the position of job_order_title.
    Date/Time: interview_dates
    Location/Phone: candidate_phone
    I will follow up with you after the interview to discuss the next step with candidate_full_name.
    Regards,
    recruiter_signature`;

    const htmlSendout = `
    {{company_name}}<br>
    {{hiring_authority_full_name}}<br><br>

    {{hiring_authority_name}},<br><br>
    Per our ____, this is the interview confirmation for {{candidate_full_name}}, for the position of {{job_order_title}}.<br><br>
    Date/Time: {{interview_dates}}<br>
    Location/Phone: {{candidate_phone}}<br><br>
    I will follow up with you after the interview to discuss the next step with {{candidate_full_name}}.<br><br>
    Regards,<br><br>
    {{recruiter_signature}}`;

    const templateSendover = `
    company_name
    hiring_authority_full_name

    hiring_authority_name,
    Per our conversation, attached is the confidential resume of candidate_full_name, for the position of job_order_title.
    I will follow up with you to discuss the next steps with candidate_full_name.
    Regards,
    recruiter_signature`;

    const htmlSendover = `
    {{company_name}}<br>
    {{hiring_authority_full_name}}<br><br>

    {{hiring_authority_name}},<br><br>
    Per our conversation, attached is the confidential resume of {{candidate_full_name}}, for the position of {{job_order_title}}.<br><br>
    I will follow up with you to discuss the next steps with {{candidate_full_name}}.<br><br>
    Regards,<br><br>
    {{recruiter_signature}}`;

    const data = [
      {
        id: 1,
        subject: 'Interview Confirmation of',
        text: templateSendout,
        html: htmlSendout,
        sendout_type_id: SendoutTypesSchemes.Sendout,
      },
      {
        id: 2,
        subject: 'Confidential Resume of',
        text: templateSendover,
        html: htmlSendover,
        sendout_type_id: SendoutTypesSchemes.Sendover,
      },
    ];

    for (const item of data) {
      if (await SendoutTemplate.find(item.id)) {
        await SendoutTemplate.query().where('id', item.id).update(item, trx);
        continue;
      } else {
        await SendoutTemplate.create(item, trx);
      }
    }
  }
}

module.exports = SendoutTemplateSeeder;
