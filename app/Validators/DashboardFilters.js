'use strict'

const { rule } = require('indicative');

class DashboardFilters {
  get rules () {
    return {
      offset: 'required|integer',
      startDate:[
        rule('dateFormat', 'YYYY-MM-DD HH:mm:ss')
      ],
      endDate:[
        rule('dateFormat', 'YYYY-MM-DD HH:mm:ss')
      ],
      coachId:'integer',
      recruiterId:'integer',
      industryId:'integer',
      regionalId:'integer'
    }
  }

  get data () {
    const requestBody = this.ctx.request.all()
    const offset = this.ctx.request.header('TimeZone')

    return Object.assign({}, requestBody, { offset })
  }

  get messages() {
    return {
      'offset.required': 'The time zone from the client is required',
      'startDate.dateFormat':'Parameter start date should have the format YYYY-MM-DD HH:mm:ss',
      'endDate.dateFormat':'Parameter start date should have the format YYYY-MM-DD HH:mm:ss',
      'offset.integer': 'Parameter time zone should be a number',
      'coachId.integer': 'Parameter time zone should be a number',
      'recruiterId.integer': 'Parameter time zone should be a number',
      'industryId.integer': 'Parameter time zone should be a number'
    };
  }

  async fails(errorMessages) {
    return this.ctx.response.status(400).send(errorMessages);
  }
}

module.exports = DashboardFilters
