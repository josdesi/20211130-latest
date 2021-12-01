'use strict'

class DeclineFeeAgreement {
  get rules() {
    return {
      declination_notes: 'required|string'
    };
  }



  get messages() {
    return {
      'declination_notes.required': 'Declination notes are mandatory',
    };
  }

  async fails(errorMessages) {
    return this.ctx.response.status(400).send(errorMessages);
  }
}

module.exports = DeclineFeeAgreement
