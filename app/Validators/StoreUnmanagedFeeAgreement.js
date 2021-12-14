'use strict'

class StoreUnmanagedFeeAgreement {
  get rules () {
    return {
      // validation rules
      hiring_authority_email:'email',
      fee_percentage:'number',
      guarantee_days:'number|min:0|max:90',
      cc_emails: 'arrayOfEmails|max:2',
      subject: 'max:255',
      flat_fee_amount: 'number'
    }
  }

  get messages() {
    return {
      'hiring_authority_id.number':'You must provide a Hiring Authority email for the fee agreement',
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

module.exports = StoreUnmanagedFeeAgreement
