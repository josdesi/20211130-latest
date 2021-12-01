'use strict';
//Repositories
const Services = new (use('App/Helpers/Services'))();

//Utils
const appInsights = require('applicationinsights');

const EmailValidation = (module.exports = {
  /**
   * Validates an email, if it exists returns the stored validation, if not then a sendgrid validation is obtained & stored for future usage
   *
   * @param {String} item - The item that its email will be validated for, must contain an attribute called email, work_email, personal_email
   */
  validate: async (item) => {
    try {
      const emailAliases = ['email', 'work_email', 'personal_email'];
      const emailValidation = async (item) => {
        if (!item) return false;

        for (const emailAlias of emailAliases) {
          const email = item[emailAlias];

          if (!email) continue;

          await Services.validateEmail(email, true);
        }
      };

      await emailValidation(item); //Check main object attributes

      for (const key of Object.keys(item)) {
        await emailValidation(item[key]); //Checks each attribute theirs main object attributes
      }

      if (item.validationHelper) {
        for (const itemToValidate of item.validationHelper) {
          await emailValidation(itemToValidate); //This object should be the last resort, I prefer not to edit the event fire parameters but sometimes (like the HAs in the company creation), an extra param would need to be sent
        }
      }
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
    }
  },
});
