'use strict';

//Models
const User = use('App/Models/User');

//Repositories
const CompanyRepository = new (use('App/Helpers/CompanyRepository'))();
const UserRepository = new (use('App/Helpers/UserRepository'))();

//Utils
const GenericSendgridTemplateEmail = new (use('App/Emails/GenericSendgridTemplateEmail'))();
const appInsights = require('applicationinsights');

class CompanyReassureEmail {
  /**
   * Send a notification copy via email to the Ops team about a pending verification
   *
   * @summary An email directed to the Ops team, contains a copy of the reassurement/verification type company notification
   *
   * @param {object} notification - Contains the information neccesary to send the email
   * @param {Number} recruiterId - Who did the changes/reassure, usually a recruiter/coach
   * @param {Number} companyId - What company was updated
   * @param {Number} companyTypeId - To what type the company was changed to
   * @param {Number} companyTypeReassureId - The reference of the reassure, helpful to end the process the recruiter started
   * @return {Object} Sendgrid response
   */
  async sendReassureOpsNotification(notification, recruiterId, companyId, companyTypeId, companyTypeReassureId) {
    try {
      if (!notification) return false;

      const userIds = Array.isArray(notification.userIds) ? notification.userIds : [notification.userIds];
      const userInformations = (await User.query().whereIn('id', userIds).with('personalInformation').fetch()).toJSON();

      const recruiter = await UserRepository.getDetails(recruiterId);
      const company = await CompanyRepository.simpleDetails(companyId);
      const companyTypeName = await CompanyRepository.getCompanyTypeDetails(companyTypeId);

      const recipients = userInformations.map((userInformation) => {
        return {
          to: {
            name: userInformation.personalInformation.full_name,
            email: userInformation.email,
          },
          dynamic_template_data: {
            recruiter_name: recruiter.full_name,
            type: companyTypeName.title,
            company_name: company.name,
            url: notification.payload.data.click_url,
          },
        };
      });

      const generalDynamicTemplateData = null; //We do not need generic template data at the moment

      const sendgridConfigurationName = 'opsCompanyTypeVerification';

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
}

module.exports = CompanyReassureEmail;
