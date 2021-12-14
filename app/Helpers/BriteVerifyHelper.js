'use strict';

//Utils
const Antl = use('Antl');
const BriteVerifyEmailValidationService = use('Services/BriteVerifyEmailValidation');
const appInsights = require('applicationinsights');
const { BriteVerifyBulkValidationStates } = use('App/Helpers/Globals');

class BriteVerifyHelper {
  async validateEmailsBatch(emails) {
    try {
      const briteVeriyResponse = await BriteVerifyEmailValidationService.validateEmailsBatch(emails);
      if (briteVeriyResponse.status !== 200) return this.formatErrorReturnObject(briteVeriyResponse);

      const emailListId = briteVeriyResponse.data.list.id;

      return {
        success: true,
        code: 200,
        data: {
          emailListId,
          ...briteVeriyResponse,
        },
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
      return {
        success: false,
        code: 500,
        message: Antl.formatMessage('messages.error.internalServer', {
          action: 'validating',
          entity: 'email batch',
        }),
      };
    }
  }

  async checkEmailsBatchStatus(emailListId) {
    try {
      const briteVeriyResponse = await BriteVerifyEmailValidationService.getEmailsBatchStatus(emailListId);
      if (briteVeriyResponse.status !== 200) return this.formatErrorReturnObject(briteVeriyResponse);

      const responseListState = briteVeriyResponse.data.state;

      const foundListState = BriteVerifyBulkValidationStates.find(({ title }) => title === responseListState);
      const defaultErrorListState = BriteVerifyBulkValidationStates.find(({ title }) => title === 'error');

      const formatedListState = foundListState ? foundListState : defaultErrorListState;
      formatedListState.pageCount = briteVeriyResponse.data.page_count || 0;

      return {
        success: true,
        code: 200,
        data: formatedListState,
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
      return {
        success: false,
        code: 500,
        message: Antl.formatMessage('messages.error.internalServer', {
          action: 'getting',
          entity: 'email batch status',
        }),
      };
    }
  }

  async getEmailsBatchList(emailListId, page = 1) {
    try {
      const briteVeriyResponse = await BriteVerifyEmailValidationService.getEmailsBatchList(emailListId, page);
      if (briteVeriyResponse.status !== 200) return this.formatErrorReturnObject(briteVeriyResponse);

      const emailValidationList = briteVeriyResponse.data.results;

      return {
        success: true,
        code: 200,
        data: emailValidationList,
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
      return {
        success: false,
        code: 500,
        message: Antl.formatMessage('messages.error.internalServer', {
          action: 'getting',
          entity: 'email batch list',
        }),
      };
    }
  }

  formatErrorReturnObject(briteVeriyResponse) {
    const responseData = briteVeriyResponse.data ? briteVeriyResponse.data : {};
    const message = responseData.message ? responseData.message : briteVeriyResponse.message;

    return {
      success: false,
      code: briteVeriyResponse.status,
      error: briteVeriyResponse.errors,
      data: responseData,
      message: message ? message : 'BriteVerify Service could not complete the action',
    };
  }

  //TODO: All the code below is extracted from Services.js, That code over there is expected to cease to exist, but due to time constraint I cannot migrate & fix all that code there
  // I'm sorry that I left the code in the state that it is, I will try to refactor/overhaul all the code there & below this comment, but as for right now, please bear with me
  buildBriteVerifyBatchInsertJSON(validation) {
    validation.email_status = validation.status;

    const formatedBody = {
      verdict: validation.email_status,
      email: validation.email,
      score: null,
      suggestion: validation.secondary_status,
      checks: { ...validation, error_code: validation.secondary_status, fromMigration: true },
    };

    const verdict = this.buildBriteVerifyJSON(formatedBody);
    formatedBody.calculated_verdict = verdict;

    return {
      email: verdict.email,
      is_valid: verdict.valid,
      score: verdict.score,
      suggestion: verdict.suggestion,
      sendgrid_response: formatedBody,
      source: 'BriteVerify',
    };
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
}

module.exports = BriteVerifyHelper;
