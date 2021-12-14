'use strict';

class StoreSearchProject {
  get rules() {
    return {
      email: 'required|email',
    };
  }

  get messages() {
    return {
      'email.email': 'The email provided is not correct',

      'email.required': 'You must provide a email',
    };
  }

  async fails(errorMessages) {
    return this.ctx.response.status(400).send(errorMessages);
  }
}

module.exports = StoreSearchProject;
