'use strict';

class IdParam {
  get rules() {
    return {
      // validation rules
      id: 'required|integer'
    };
  }

  get data() {
    const requestBody = this.ctx.request.all();
    const id = this.ctx.params.id;

    return Object.assign({}, requestBody, { id });
  }

  get messages() {
    return {
      'id.integer': 'Only integers are allowed'
    };
  }

  async fails(errorMessages) {
    return this.ctx.response.status(400).send(errorMessages);
  }
}

module.exports = IdParam;
