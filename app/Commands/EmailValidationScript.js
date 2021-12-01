'use strict';

const { Command } = require('@adonisjs/ace');
const EmailValidation = new (use('App/Emails/EmailValidation'))();

class EmailValidationScript extends Command {
  static get signature() {
    return 'email:validation';
  }

  static get description() {
    return 'Start the sendgrid email validation script';
  }

  async handle(args, options) {
    this.info('Sendgrid email validation started');

    const self = this;
    await EmailValidation.runScript(self);
  }
}

module.exports = EmailValidationScript;
