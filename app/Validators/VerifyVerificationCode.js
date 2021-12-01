'use strict';

class GenerateVerificationCode {
  get rules() {
    return {
      code: 'required|string|min:5|max:5',
    };
  }

  get messages() {
    return {
      'code.required': 'You must provide an verification code',
      'code.min': '{{field}} must have {{argument.0}} digits',
      'code.max': '{{field}} must have {{argument.0}} digits',
    };
  }

  async fails(errorMessages) {
    return this.ctx.response.status(400).send(errorMessages[0]);
  }
}

module.exports = GenerateVerificationCode;
