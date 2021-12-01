'use strict'

class GetNotificationHistory {
  get rules () {
    return {
      startDate : 'date',
      limit: 'integer|min:1|max:50'
    }

    
  }

  get messages() {
    return {
      'startDate.date': 'startDate must be a date',
      'limit.integer': 'limit must be an integer between 1 and 50',
      'limit.min': 'limit must be an integer between 1 and 50',
      'limit.max': 'limit must be an integer between 1 and 50',
    };
  }

  async fails(errorMessages) {
    return this.ctx.response.status(400).send(errorMessages);
  }
}

module.exports = GetNotificationHistory
