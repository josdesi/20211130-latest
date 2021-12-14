'use strict';

class BaseValidator {

  get body(){
    return this.ctx._request_._body;
  }

  async fails(errorMessages) {
    return this.ctx.response.status(400).send(errorMessages);
  }
}

module.exports = BaseValidator;
