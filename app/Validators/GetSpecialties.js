'use strict'

class GetSpecialties {
  get rules() {
    return {
      // validation rules
      industryId: 'integer'
    };
  }

  get messages() {
    return {
      'industryId.integer': 'Only integers are allowed'
    };
  }

  async fails(errorMessages) {
    return this.ctx.response.status(400).send(errorMessages);
  }
}

module.exports = GetSpecialties
