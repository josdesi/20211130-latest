'use strict';

class ReassignCandidate {
  get rules() {
    return {
      recruiter_id: 'required|integer'
    };
  }

  get messages() {
    return {
      'recruiter_id.required': 'You must provide a recruiter_id'
    };
  }

  async fails(errorMessages) {
    return this.ctx.response.status(400).send(errorMessages);
  }
}

module.exports = ReassignCandidate;
