'use strict'

const { LogicalException } = require('@adonisjs/generic-exceptions')
const defaultMessage = 'Requested resource not found'
const defaultStatus = 404
const defaultCode = 'E_RESOURCE_NOT_FOUND'
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
