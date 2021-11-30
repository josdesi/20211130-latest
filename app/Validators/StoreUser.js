'use strict';
const Antl = use('Antl');

class StoreUser {
  get rules() {
    return {
      // validation rules
      code: 'required_when:access_token,null',
      access_token: 'required_when:code,null',
    };
  }

  get messages() {
    return {
      'code.required_when':  Antl.formatMessage('messages.validation.required', { field: 'code' }),
      'access_token.required_when':  Antl.formatMessage('messages.validation.required', { field: 'access token' }),
    };
  }

  async fails(errorMessages) {
    return this.ctx.response.send(errorMessages);
  }
}

module.exports = StoreUser;
