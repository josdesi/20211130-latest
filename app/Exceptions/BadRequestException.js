'use strict'

const { LogicalException } = require('@adonisjs/generic-exceptions')
const defaultMessage = 'Request parameters does not fit the requirements'
const defaultStatus = 400
const defaultCode = 'BAD_REQUEST'
class BadRequestException extends LogicalException {
  /**
   * Handle this exception by itself
   */
  // handle () {}

  constructor (message, status, code) {
    super(message || defaultMessage, status || defaultStatus, code  || defaultCode)
  }
}

module.exports = BadRequestException
