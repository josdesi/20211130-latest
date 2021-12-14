'use strict';

class PaginateParam {
  get rules() {
    return {
      // validation rules
      page: 'required|integer',
      perPage: 'required|integer'
    };
  }

  get data() {
    const { page, perPage } = this.ctx.request.all();

    return Object.assign({}, { page, perPage });
  }

  get messages() {
    return {
      'page.integer': 'Only integers are allowed',
      'perPage.integer': 'Only integers are allowed'
    };
  }

  async fails(errorMessages) {
    return this.ctx.response.status(400).send(errorMessages);
  }
}

module.exports = PaginateParam;
