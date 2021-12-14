'use strict';

class UpdateScheduledBulkEmailDate {
  get rules() {
    return {
      send_date: 'required|date',
    };
  }

  get messages() {
    return {
      'send_date.required': 'You must provide the date when the scheduled email is going to be sent.',
    };
  }

  async fails(errorMessages) {
    return this.ctx.response.status(400).send(errorMessages);
  }
}

module.exports = UpdateScheduledBulkEmailDate;
