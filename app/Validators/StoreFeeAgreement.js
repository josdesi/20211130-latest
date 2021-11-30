'use strict'

class StoreFeeAgreement {
  get rules () {
    return {
      // validation rules
      hiring_authority_email:'required|email',
      fee_percentage:'required|number',
      guarantee_days:'required|number',
      cc_emails: 'arrayOfEmails|max:2',
      subject: 'max:255',
      flat_fee_amount: 'number'
    }
  }

  get messages() {
    return {
      'hiring_authority_email':'You must provide a Hiring Authority email for the fee agreement',
      'hiring_authority_email.email':'You must provide a valid Hiring Authority email for the fee agreement',
      'fee_percentage.required':'You must provide a fee percentage for the fee agreement',
      'guarantee_days.required':'You must provide the guarantee days for the fee agreement',
      'cc_emails.arrayOfEmails': 'You must provide a list of emails',
      'cc_emails.max': 'You can provide two cc emails at most',
      'subject.max': 'Subject must not be larger than 255 characters',
      'flat_fee_amount.number': 'Flat fee must be a number'
    };
  }

  async fails(errorMessages) {
    return this.ctx.response.status(400).send(errorMessages);
  }
}

module.exports = StoreFeeAgreement
