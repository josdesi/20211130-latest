'use strict';

class GenerateVerificationCode {
  get rules() {
    return {
      email: 'required|max:254|string|email',
    };
  }

  get messages() {
    return {
      'email.required': 'You must provide an email',
    };
  }

  async fails(errorMessages) {
    return this.ctx.response.status(400).send(errorMessages[0]);
  }
}

module.exports = GenerateVerificationCode;
