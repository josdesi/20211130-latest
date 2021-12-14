'use strict';

//Models
const User = use('App/Models/User');
const FeeAgreementPaymentScheme = use('App/Models/FeeAgreementPaymentScheme');

//Repositories
const CompanyFeeAgreement = use('App/Models/CompanyFeeAgreement');
const UserRepository = new (use('App/Helpers/UserRepository'))();
//Utils
const { getFileAsBase64 } = use('App/Helpers/FileHelper');
const Drive = use('Drive');
const FeeAgreementContractManager = use('App/Helpers/FeeAgreementContractManager');
const GenericSendgridTemplateEmail = new (use('App/Emails/GenericSendgridTemplateEmail'))();
const appInsights = require('applicationinsights');
const  { FeeAgreementPaymentSchemes, FeeAgreementSignatureProcessType } = use('App/Helpers/Globals');
const Database = use('Database');
const Env = use('Env');
class FeeAgreementEmails {
  /**
   * Send a validation notification email from fee agrement
   *
   * @summary An Email that is usually directed to the coach of the recruter when a non-standard fee is created
   *
   * @param {object} notification - Contains the information neccesary to sent the email
   * @param {boolean} isFromCoach - If true, the email instea of having the recruiter name, will have the coach
   *
   * @return {Object} Sendgrid response
   */
   async sendValidationEmail(notification, isFromCoach = false) {
    try {
      if (notification === null || notification === undefined) return false;

      const userIds = Array.isArray(notification.userIds) ? notification.userIds : [notification.userIds];

      const userInformations = (await User.query().whereIn('id', userIds).with('personalInformation').fetch()).toJSON();

      const feeAgreementInformation = (
        await this.loadFeeAgreement(notification.payload.data.feeAgreementId)
      ).toJSON();
      const payment = (
        await FeeAgreementPaymentScheme.find(feeAgreementInformation.fee_agreement_payment_scheme_id)
      ).toJSON();

      const recipients = userInformations.map((userInformation) => {
        return {
          to: {
            name: userInformation.personalInformation.full_name,
            email: userInformation.email,
          },
          dynamic_template_data: {
            recruiter_name: isFromCoach ? feeAgreementInformation.coach.personalInformation.full_name : feeAgreementInformation.creator.personalInformation.full_name,
            type: payment.title,
            company_name: feeAgreementInformation.company.name,
            ha_name: feeAgreementInformation.hiringAuthority.full_name,
            fee: feeAgreementInformation.fee_percentage,
            guarantee_days: feeAgreementInformation.guarantee_days,
            view_url: notification.payload.data.click_url,
          },
        };
      });

      const generalDynamicTemplateData = null; //We do not need generic template data at the moment

      const sendgridConfigurationName = 'feeValidationEmail';

      const response = await GenericSendgridTemplateEmail.sendViaConfig(
        recipients,
        generalDynamicTemplateData,
        sendgridConfigurationName
      );

      return {
        success: true,
        response,
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
      return {
        success: false,
        error,
      };
    }
  }

  /**
   * Send a notification to Regional Director when fee agreement is sent
   *
   * @summary An Email that is usually directed to the coach of the recruter when a non-standard fee is created
   *
   * @param {CompanyFeeAgreement} feeAgreement
   *
   * @return {Object} Sendgrid response
   */
   async sendRegionalDirectorEmail(feeAgreement) {
    try {
     const company = await feeAgreement.company().fetch();
     const coach = (await feeAgreement.coach().with('personalInformation').fetch()).toJSON();
     const recruiter = (await feeAgreement.creator().with('personalInformation').fetch()).toJSON();
     const paymentSheme = await feeAgreement.paymentScheme().fetch();
     const regionalDirector = await UserRepository.getRegionalDirectorByCoachId(feeAgreement.coach_id);
     const extractName = (user) => user && user.personalInformation && user.personalInformation.full_name ? user.personalInformation.full_name : '';

      const dynamic_template_data = {
        company_name: company.name,
        recruiter_name: extractName(recruiter),
        coach_name: extractName(coach),
        payment_scheme: paymentSheme.title,
        guarantee_days: feeAgreement.guarantee_days ? feeAgreement.guarantee_days : '',
        fee_percent: feeAgreement.fee_percentage ? `${feeAgreement.fee_percentage}%` : '',
      };


      

      const recipient = {
        to: {
          name: extractName(regionalDirector),
          email: regionalDirector.email,
        },
        dynamic_template_data
      };
      const generalDynamicTemplateData = null;
      const sendgridConfigurationName = 'feeAgreementSentRegionalDirectorNotification';

      const response = await GenericSendgridTemplateEmail.sendViaConfig(
        [recipient],
        generalDynamicTemplateData,
        sendgridConfigurationName
      );

      return {
        success: true,
        response,
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
      return {
        success: false,
        error,
      };
    }
  }

  /**
   * Send a thank email tho Hiring authority when fee agreement is sent
   *
   * @summary An Email that is usually directed to the coach of the recruter when a non-standard fee is created
   *
   * @param {CompanyFeeAgreement} feeAgreement
   *
   * @return {Object} Sendgrid response
   */
   async sendHiringAuthorityThankEmail(feeAgreement) {
    try {
     const hiringAuthority = await feeAgreement.hiringAuthority().fetch();
     const recruiter = (await feeAgreement.creator().with('personalInformation').fetch()).toJSON();
     const extractName = (user) => user && user.personalInformation && user.personalInformation.first_name ? user.personalInformation.first_name : '';

      const dynamic_template_data = {
        hiring_name: hiringAuthority.name,
        recruiter_name: extractName(recruiter)
      };


      

      const recipient = {
        to: {
          name: hiringAuthority.full_name,
          email: feeAgreement.ha_email || hiringAuthority.work_email,
        },
        dynamic_template_data
      };
      const generalDynamicTemplateData = null;
      const sendgridConfigurationName = 'feeAgreementThankEmail';

      const response = await GenericSendgridTemplateEmail.sendViaConfig(
        [recipient],
        generalDynamicTemplateData,
        sendgridConfigurationName
      );

      return {
        success: true,
        response,
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
      return {
        success: false,
        error,
      };
    }
  }

  formatMoney(number) {
    if (number === null || number === undefined) return '';
        return new Intl.NumberFormat('en', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 2
        }).format(number);
  }

  async loadFeeAgreement(id) {
    const feeAgreement = await CompanyFeeAgreement.find(id);
    if (!feeAgreement) return null;
    await feeAgreement.loadMany({
      'company':(builder) => builder.select('*'),
      'company.specialty': (builder) =>  { builder.select(['*']) },
      'company.specialty.industry': (builder) =>  { builder.select(['*']) },
      'hiringAuthority': (builder) =>  builder.select(['*']) ,
      'feeAgreementStatus': (builder) =>   {
        builder.select(['id', 'internal_name'])
      },
      'feeAgreementStatus.group': (builder) =>   {
        builder.select(['id', 'title', 'style_class_name'])
      },
      'currentDeclinator': (builder) =>  {
        builder.select(['id', 'initials', 'role_id'])
      },
      'regional': (builder) =>  {
        builder.select(['id', 'initials'])
      },
      'regional.personalInformation': (builder) =>  {
        builder.select(['id', 'full_name'])
      },
      'currentDeclinator.personalInformation': (builder) =>  {
        builder.select(['id', 'full_name'])
      },
      'creator': (builder) =>  {
        builder.select(['id', 'initials'])
      },
      'creator.personalInformation': (builder) =>  {
        builder.select(['id', 'full_name'])
      },
      'coach': (builder) =>  {
        builder.select(['id', 'initials'])
      },
      'paymentScheme': (builder) => { builder.select('*') },
      'coach.personalInformation': (builder) =>  {
        builder.select(['id', 'full_name'])
      },
      'eventLogs': (builder) => {
        builder
          .select('id, fee_agreement_event_id', 'result_fee_agreement_status_id', 'event_type_id', 'event_details', Database.raw('COALESCE(real_date, created_at) as created_at'))
      },
      'eventLogs.event': (builder) => {builder.select('*')},
      'eventLogs.resultStatus': (builder) => {builder.select('*')},
    });
    return feeAgreement;
  }

    /**
   * Send a validation notification email from fee agrement
   *
   * @summary An Email that is usually directed to the coach of the recruter when a non-standard fee is created
   *
   * @param {object} notification - Contains the information neccesary to sent the email
   * @param {boolean} isFromCoach - If true, the email instea of having the recruiter name, will have the coach
   *
   * @return {Object} Sendgrid response
   */
     async sendSignedEmailToSendouts(feeAgreement, isFromCoach = false) {
      try {  
        const feeAgreementInformation = feeAgreement.toJSON();
        const payment = (
          await FeeAgreementPaymentScheme.find(feeAgreementInformation.fee_agreement_payment_scheme_id)
        ).toJSON();
        const url = Env.get('PUBLIC_URL_WEB');
        const specialtyIndustry = await Database.from('v_specialties').select(['industry', 'title']).where('id', feeAgreementInformation.company.specialty_id).first();
        const dynamic_template_data = {
          recruiter_name: isFromCoach ? feeAgreementInformation.coach.personalInformation.full_name : feeAgreementInformation.creator.personalInformation.full_name,
          coach_name: feeAgreementInformation.coach.personalInformation.full_name,
          regional_director_name: feeAgreementInformation.regional.personalInformation.full_name,

          
          company_name: feeAgreementInformation.company.name,
          industry_specialty: `${specialtyIndustry.industry}: ${specialtyIndustry.title}`,
          hiring_authority_name: feeAgreementInformation.hiringAuthority ? feeAgreementInformation.hiringAuthority.full_name : '',

          type: payment.title,
          fee: feeAgreementInformation.fee_agreement_payment_scheme_id == FeeAgreementPaymentSchemes.Flat ? this.formatMoney(feeAgreementInformation.flat_fee_amount) : `${feeAgreementInformation.fee_percentage}%`,
          guarantee_days: feeAgreementInformation.guarantee_days ? feeAgreementInformation.guarantee_days : 'N/A',

          company_profile_url: `${url}/companies/profile/${feeAgreementInformation.company.id}?tab=feeagreements`,

          hiring_authority_profile_url: feeAgreementInformation.hiringAuthority ? `${url}/hiringauthority/profile/${feeAgreementInformation.hiringAuthority.id}` : ''
        };
        const recipients = [
          {
            to: {
              name: 'Gpac Sendouts',
              email: Env.get('SENDOUTS_EMAIL')
            },
            dynamic_template_data
          }
        ];
        
        const generalDynamicTemplateData = null; //We do not need generic template data at the moment
        const attachmentData = await this.getFeeAgreementPDFInBase64(feeAgreement);
        const sendgridConfigurationName = 'feeeSendoutsCopyEmail';
        const attachments = [
          {
            filename: `Service_agreement_with_gpac.pdf`,
            content: attachmentData,
            type: 'application/pdf',
            disposition: 'attachment'
          }
        ];
        const response = await GenericSendgridTemplateEmail.sendViaConfig(
          recipients,
          generalDynamicTemplateData,
          sendgridConfigurationName,
          attachments
        );
  
        return {
          success: true,
          response,
        };
      } catch (error) {
        appInsights.defaultClient.trackException({ exception: error });
        return {
          success: false,
          error,
        };
      }
    }

    async getFeeAgreementPDFInBase64(feeAgreement) {

      if (feeAgreement.signature_process_type_id != FeeAgreementSignatureProcessType.ExternalUnmanaged) {
        const feeAgreementContractManager = await FeeAgreementContractManager.buildDefault();
        return await feeAgreementContractManager.getFilesInBase64(feeAgreement);
      }
      return getFileAsBase64(feeAgreement.pdf_url);
    }
}

module.exports = FeeAgreementEmails;
