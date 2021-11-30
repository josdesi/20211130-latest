'use strict';

//Repositories
const Services = new (use('App/Helpers/Services'))();

//Utils
const appInsights = require('applicationinsights');
const Database = use('Database');
const { chunk, uniq } = use('lodash');
const EmailRegex = /^[a-zA-Z0-9.!#$%&’*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;

class EmailValidation {
  /**
   * Runs a cycle in which it will compares all emails from the database @method getEmailStack and stores it response
   *
   * @param {object} messageHandler
   */
  async runScript(messageHandler) {
    try {
      messageHandler.info(`Getting the email stack`);
      const emailStack = await this.getEmailStack();

      if (emailStack.length <= 0) {
        messageHandler.warn("There aren't any email to verify");
        return;
      }
      messageHandler.info(`The email stack has a length of ${emailStack.length}`);

      let errorBreak = false;

      while (emailStack.length > 0) {
        let releaseDate = null;
        const apiPromises = [];
        const startTime = Date.now();
        const startingStock = emailStack.length;

        const firstResponse = await Services.validateEmailScript(emailStack.pop());

        const percentageForFortpac = 0 //E.g.: 0.2 means a 20% is left for fortpac, while 80% for this method
        const apiRateLimitLeft = Math.round(Number(firstResponse.rateLimit) * percentageForFortpac); //We want to left a % to fortpac
        let apiRateLeft = Number(firstResponse.rateLeft);

        messageHandler.warn(`Starting validation cycle`);
        messageHandler.info(`The api rate limit left is: ${apiRateLimitLeft} and so far ${apiRateLeft} remains`);

        messageHandler.warn(`What sendgrid says we have left of the rate: ${apiRateLeft}`);
        messageHandler.warn(`Our minumum limit: ${apiRateLimitLeft}`);
        while (apiRateLimitLeft <= apiRateLeft && emailStack.length > 0) {
          messageHandler.info(`Yup, I'm on the while that is inside another while`);
          const apiPromise = Services.validateEmailScript(emailStack.pop(), messageHandler);
          apiPromises.push(apiPromise);
          apiRateLeft--;
        }

        const apiResponses = await Promise.all(apiPromises);
        const latestResponse = apiResponses[apiResponses.length - 1]
          ? apiResponses[apiResponses.length - 1]
          : firstResponse;

        messageHandler.warn(`Validation cycle finished`);

        if (!latestResponse || latestResponse.failure) {
          errorBreak = true;
          messageHandler.error('Something went wrong');
          messageHandler.error(latestResponse);
          break;
        }

        if (emailStack.length <= 0) break;

        releaseDate = latestResponse.releaseDate;
        const sleepDuration = releaseDate - Date.now();

        messageHandler.warn(`The script will run again at: ${new Date(releaseDate)}`);
        messageHandler.info(`Sleep Duration: ${Math.round(sleepDuration / 1000)}s`);
        messageHandler.info(`Emails left in the stack: ${emailStack.length}`);
        messageHandler.info(
          this.calculateRemainingTime(
            startTime,
            Date.now() + sleepDuration,
            sleepDuration,
            startingStock,
            emailStack.length
          )
        );

        if (sleepDuration > 0) await this.sleep(sleepDuration);
      }

      const responseData = errorBreak
        ? {
            code: 500,
            success: false,
            message: 'Something went wrong and the validation could not be finished',
          }
        : {
            code: 200,
            success: true,
            message: 'Validation finished!',
          };

      messageHandler.success('Finish');

      return responseData;
    } catch (error) {
      messageHandler.error(error);
      console.error(error);
      appInsights.defaultClient.trackException({ exception: error });
    }
  }

  sleep(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  calculateRemainingTime(startTime, endTime, surplusTime, startingStock, endingStock) {
    // const secondsUsed = (endTime - startTime) / 1000;
    const secondsUsed = 3; //Yeah, 3 seconds is de ~
    const remainingTime = (endingStock / (startingStock - endingStock)) * secondsUsed + surplusTime / 1000;
    const estimatedDate = new Date(Date.now() + remainingTime * 1000);

    return `Remaining time: ${Math.round(remainingTime)}s, or at around ${estimatedDate}`;
  }

  async getEmailStack() {
    const maxChunkSize = 200;
    const emailComparison = (email) => EmailRegex.exec(email) !== null;

    const { candidates, hiringAuthorites, names } = await this.getEmailsFromDatabase();

    const candidatesFilterPromise = this.filterOutEmails(emailComparison, maxChunkSize, candidates);
    const hiringAuthoritesFilterPromise = this.filterOutEmails(emailComparison, maxChunkSize, hiringAuthorites);
    const namesFilterPromise = this.filterOutEmails(emailComparison, maxChunkSize, names);

    const [filteredCandidates, filteredHA, filteredNames] = await Promise.all([
      candidatesFilterPromise,
      hiringAuthoritesFilterPromise,
      namesFilterPromise,
    ]);

    const emailStack = [...filteredCandidates, ...filteredHA, ...filteredNames];

    return uniq(emailStack);
  }

  async getEmailsFromDatabase() {
    const validatedEmailsQuery = Database.table('sendgrid_email_validations').select('email');

    const candidates = await Database.table('candidates')
      .select('email')
      .distinct()
      .whereNotIn('email', validatedEmailsQuery);
    const hiringAuthorites = await Database.table('hiring_authorities')
      .select('work_email as email')
      .distinct()
      .whereNotIn('work_email', validatedEmailsQuery);
    const names = await Database.table('names').select('email').distinct().whereNotIn('email', validatedEmailsQuery);

    return {
      candidates: candidates.map((row) => row.email),
      hiringAuthorites: hiringAuthorites.map((row) => row.email),
      names: names.map((row) => row.email),
    };
  }

  async filterOutEmails(comparison, maxChunkSize, array) {
    const chunkedArray = chunk(array, maxChunkSize);
    let newArray = [];

    for (const row of chunkedArray) {
      newArray = [...newArray, ...row.filter(comparison)];
    }

    return newArray;
  }
}

module.exports = EmailValidation;
