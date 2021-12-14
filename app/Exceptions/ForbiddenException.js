'use strict'

const { LogicalException } = require('@adonisjs/generic-exceptions')
const defaultMessage = 'Current role/credentials has not access to requested resource'
const defaultStatus = 403
const defaultCode = 'E_FORBIDDEN_ACCESS'
class NotFoundException extends LogicalException {
  /**
   * Handle this exception by itself
   */
  // handle () {}

  constructor (message, status, code) {
    super(message || defaultMessage, status || defaultStatus, code  || defaultCode)
  }
}

module.exports = NotFoundException
