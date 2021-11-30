'use strict'

class TrackPhoneEvent {
  get rules () {
    return {
      dataEvent: 'required',
      activityLogTypeId: 'required|integer'
    }
  }

  get messages() {
    return {
      'dataEvent.required': 'The data of the activity is required',
      'activityLogTypeId.required':'The activity type is required'
    };
  }

  async fails(errorMessages) {
    return this.ctx.response.status(400).send(errorMessages);
  }
}

module.exports = TrackPhoneEvent
