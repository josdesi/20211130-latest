'use strict'

class GetLastActivity {
  get rules () {
    return {
      // validation rules
      entityType : 'required|string',
      entityId : 'required|integer',
    }
  }

  get messages() {
    return {
      'entityType.required': 'An entityType is required',
      'entityId.required': 'An entityId is required',
      'entityId.integer': 'Parameter entityId must be an integer',
    };
  }

  async fails(errorMessages) {
    return this.ctx.response.status(400).send(errorMessages);
  }
}

module.exports = GetLastActivity
