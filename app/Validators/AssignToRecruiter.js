'use strict'

class AssignToRecruiter {
  get rules() {
    return {
      recruiter_id: 'required|integer'
    };
  }

  get messages() {
    return {
      'recruiter_id.required': 'A recruiter is required to assign this item'
    };
  }

  async fails(errorMessages) {
    return this.ctx.response.status(400).send(errorMessages);
  }
}

module.exports = AssignToRecruiter
