'use strict';

//Models
const SendgridEmailValidation = use('App/Models/SendgridEmailValidation');
const ModulePresetsConfig = use('App/Models/ModulePresetsConfig');

//Utils
const Env = use('Env');
const SendgridEmailValidationService = use('Services/SendgridEmailValidation');
const BriteVerifyEmailValidationService = use('Services/BriteVerifyEmailValidation');
const appInsights = require('applicationinsights');
const { joinStringForQueryUsage } = use('App/Helpers/Globals');
const Database = use('Database');
const Source = {
  BriteVerify: 'BriteVerify',
  Sendgrid: 'Sendgrid',
};

class ServiceHelper {
  /**
   * Validates the email with the sendgrid validation services & stores its response
   *
   * @param {String} email
   * @param {Boolean} storeEmail
   *
   * @summary This methods checks if the emails with the sendgrid service, if storeEmail is true it creates a entry in sendgrid_email_validations
   *
   * @returns {Object} Response with a status code & message
   */
  async validateEmail(email, storeEmail = true) {
    try {
      const emailExists = await SendgridEmailValidation.query().where({ email }).first();

      if (emailExists) {
        return {
          success: true,
          code: 200,
          message: 'The email was already validated by our system',
          data: await this.getExistingValidation(emailExists),
        };
      }

      const { statusCode, body, headers, message, source } = await this.validateEmailLoop(email);

      if (statusCode === 429) {
        const releaseDate = new Date(headers['x-ratelimit-reset'] * 1000);
        return {
          success: false,
          code: 429,
          message: `The email validation service is currently overloaded, please wait until ${releaseDate} & try again`,
          data: {
            reset_time: releaseDate,
          },
        };
      }

      if (statusCode !== 200) {
        //This is not an error, but we should be wary when sendgrid does not sends a 200
        appInsights.defaultClient.trackException({ exception: { statusCode, body, headers, message } });
        return {
          success: false,
          code: statusCode ? statusCode : 500,
          message: message ? `Sendgrid could not validate the email: ${message}` : 'We could not validate the email',
        };
      }

      const verdict = this.calculateVerdict(body, source);

      if (storeEmail) await this.createEmailValidation(body, verdict, source);

      return {
        success: true,
        code: 201,
        data: verdict,
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
      return {
        success: false,
        code: 500,
        message: 'There was a problem while validating the email',
      };
    }
  }

  async validateEmailLoop(email) {
    let maxTries = 5;
    let success = false;
    let latestResponse = {};
    while (!success && maxTries > 0) {
      // latestResponse = await SendgridEmailValidationService.validateEmail(email); //TODO: If needed, add suppor to be changed out 'easily'
      const briteVeriyResponse = await BriteVerifyEmailValidationService.validateEmail(email);
      latestResponse = this.formatBriteVerifyResponse(briteVeriyResponse);

      switch (latestResponse.statusCode) {
        case 429:
          const releaseDate = latestResponse.headers['x-ratelimit-reset'] * 1000;
          const sleepDuration = releaseDate - Date.now();
          if (sleepDuration > 0) await this.sleep(sleepDuration);
          break;

        case 200:
          success = true;
          break;

        default:
          throw new Error(
            'Something went wrong while doing the email validation loop, most likely the API changed its response structure'
          );
      }

      maxTries--;
    }

    return latestResponse;
  }

  async getExistingValidation(emailExists) {
    if (emailExists.source === Source.BriteVerify) {
      return this.buildBriteVerifyVerdictJSON(
        emailExists.email,
        emailExists.is_valid,
        emailExists.score,
        emailExists.suggestion,
        emailExists.sendgrid_response.checks
      );
    }

    return this.buildSendgridVerdictJSON(
      emailExists.email,
      emailExists.is_valid,
      emailExists.score,
      emailExists.suggestion,
      emailExists.sendgrid_response.checks
    );
  }

  formatBriteVerifyResponse(response) {
    response.statusCode = response.status;
    response.body = {
      result: {
        verdict: response.data.email.status,
        email: response.data.email.address,
        score: null,
        suggestion: response.data.email.error,
        checks: response.data.email,
      },
    };
    response.source = Source.BriteVerify;

    return response;
  }

  sleep(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  /**
   * Method only usable via the script
   *
   * @param {String} email
   * @param {Boolean} storeEmail
   *
   * @summary This methods works akin to @method validateEmail but it has been striped to its core, due to it being called in the script & needed to be done quick
   *
   * @returns {Object} Response with a status code & message
   */
  async validateEmailScript(email, messageHandler) {
    try {
      const { statusCode, body, headers, message } = await SendgridEmailValidationService.validateEmail(email);

      if (statusCode === 429) return { rateLeft: 0, releaseDate: headers['x-ratelimit-reset'] * 1000 };

      if (statusCode !== 200) return { failure: true, error: message };

      const verdict = this.calculateVerdict(body);

      await this.createEmailValidation(body, verdict);

      if (messageHandler) messageHandler.info(`Validating: ${verdict.email}`);

      return {
        created: true,
        email: verdict.email,
        rateLimit: headers['x-ratelimit-limit'],
        rateLeft: headers['x-ratelimit-remaining'],
        releaseDate: headers['x-ratelimit-reset'] * 1000,
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
      return { failure: true, error };
    }
  }

  /**
   * Returns the emails found in the sendgridEmailValidation
   *
   * @param {String} type: 'valid' || 'invalid' || null
   * @param {Object[]} emails - An array of email, this method will return the interception between the found emails & the emails passed
   *
   * @summary This methods returns the emails stored in the sendgri email validation "cache", it can returns all, only the valid or the invalid
   *
   * @returns {Array} sendgridEmailValidations
   */
  async getSendgridValidationEmails(type, emails = []) {
    try {
      const query = SendgridEmailValidation.query().select(
        Database.raw('LOWER(email) as email'),
        'is_valid',
        Database.raw("LOWER(sendgrid_response->>'verdict') as verdict")
      );
      const invalidVerdicts = ['unknown', 'accept_all'];
      const allowedInvalid = Env.get('ALLOWED_VERDICTS', '').split('|');
      const verdictsToRemove = invalidVerdicts.filter((verdict) => !allowedInvalid.includes(verdict));

      switch (type.toLowerCase()) {
        case 'valid':
          query.where('is_valid', true);
          break;

        case 'invalid':
          query.where((builder) => {
            builder.where('is_valid', false);

            if (verdictsToRemove.length > 0) {
              builder.orWhereIn(Database.raw("LOWER(sendgrid_response->>'verdict')"), verdictsToRemove);
            }
          });
          break;

        default:
          break;
      }

      if (emails.length > 0) query.whereRaw(`LOWER(email) IN ${joinStringForQueryUsage(emails, true)}`);

      const result = (await query.fetch()).toJSON();

      return {
        success: true,
        code: 200,
        data: result,
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
      return {
        success: false,
        code: 500,
        message: 'Could not get the sendgrid email validations',
      };
    }
  }

  calculateVerdict({ result }, source = Source.Sendgrid) {
    if (source === Source.BriteVerify) {
      return this.buildBriteVerifyJSON(result);
    } else {
      return this.buildSendgridJSON(result);
    }
  }

  buildBriteVerifyJSON(result) {
    switch (result.verdict) {
      case 'valid':
        return this.buildBriteVerifyVerdictJSON(result.email, true, result.score, result.suggestion, result.checks);

      case 'accept_all':
        return this.buildBriteVerifyVerdictJSON(result.email, true, result.score, result.suggestion, result.checks);

      case 'unknown':
        return this.buildBriteVerifyVerdictJSON(result.email, true, result.score, result.suggestion, result.checks);

      case 'invalid':
        return this.buildBriteVerifyVerdictJSON(result.email, false, result.score, result.suggestion, result.checks);

      default:
        return this.buildBriteVerifyVerdictJSON(result.email, false, result.score, result.suggestion, result.checks);
    }
  }

  buildBriteVerifyVerdictJSON(email, verdict, score, suggestion, checks) {
    const reason = verdict ? null : this.getBriteVerifyInvalidReason(checks);
    return { email, valid: verdict, score, suggestion: suggestion ? suggestion : null, reason };
  }

  getBriteVerifyInvalidReason({ error_code, disposable, role_address }) {
    let reasonStart = 'We detected the next issues with the email:';
    let reason = `${reasonStart}`;

    if (error_code === 'email_address_invalid') {
      reason = `${reason} The email address format is incorrect.`;
    }

    if (error_code === 'email_domain_invalid') {
      reason = `${reason} The email address is associated with a domain that doesn't exist.`;
    }

    if (error_code === 'email_account_invalid') {
      reason = `${reason} The email account (the inbox) does not exist at the given domain.`;
    }

    if (disposable || error_code === 'disposable') {
      reason = `${reason} Email address is disposable and the inbox will self-destruct.`;
    }

    if (role_address || error_code === 'role_address') {
      reason = `${reason} Email address was created to message a function like sales@, support@, or postmaster@.`;
    }

    return reason;
  }

  buildSendgridJSON(result) {
    switch (result.verdict) {
      case 'Valid':
        return this.buildSendgridVerdictJSON(result.email, true, result.score, result.suggestion, result.checks);

      case 'Risky':
        return this.buildSendgridVerdictJSON(result.email, false, result.score, result.suggestion, result.checks);

      case 'Invalid':
        return this.buildSendgridVerdictJSON(result.email, false, result.score, result.suggestion, result.checks);

      default:
        return this.buildSendgridVerdictJSON(result.email, false, result.score, result.suggestion, result.checks);
    }
  }

  buildSendgridVerdictJSON(email, verdict, score, suggestion, checks) {
    const reason = verdict ? null : this.getSendgridInvalidReason(checks);
    return { email, valid: verdict, score, suggestion: suggestion ? suggestion : null, reason };
  }

  getSendgridInvalidReason({ additional, domain, local_part }) {
    let reasonStart = 'We detected the next issues with the email:';
    let reason = `${reasonStart}`;

    if (additional.has_known_bounces) {
      reason = `${reason} The email address has bounced back our previous emails`;
    } else {
      if (additional.has_suspected_bounces) {
        reason = `${reason} The email address has a high probability of bouncing the email.`;
      }
    }

    if (!domain.has_mx_or_a_record) {
      reason = `${reason} The email domain does not seems to be correct.`;
    }

    if (domain.is_suspected_disposable_address) {
      reason = `${reason} The email address appears to be a disposable email.`;
    }

    if (!domain.has_valid_address_syntax) {
      reason = `${reason} The email address has a wrong syntaxis`;
    }

    if (reason === reasonStart) {
      reason = `${reason} The email address has a very low trust factor`;
    }

    return reason;
  }

  /**
   * Validates the email with the sendgrid validation services & stores its response
   *
   * @param {Object} Response's body that SendgridEmailValidationService.validateEmail() should return
   *
   * @summary Creates a entry in sendgrid_email_validations
   *
   * @returns {Object} Entry created
   */
  async createEmailValidation({ result }, verdict, source = Source.Sendgrid) {
    result.calculated_verdict = verdict;

    const sendgridEmailValidation = {
      email: result.email,
      is_valid: verdict.valid,
      score: verdict.score,
      suggestion: verdict.suggestion,
      sendgrid_response: result,
      source,
    };

    return await SendgridEmailValidation.create(sendgridEmailValidation);
  }

  /**
   * Returns a Suppresion Group Id value from the Database
   *
   * @param {Number} {key} - What key it has assigned in the Global variable SendgridSuppressionGroups
   *
   * @returns {Number} Group id
   */
  async getSendgridSuppressionGroup({ key }) {
    const modulePreset = await ModulePresetsConfig.query().where('id', key).first();
    if (!modulePreset) return false;

    return Number(modulePreset.data);
  }
}

module.exports = ServiceHelper;
