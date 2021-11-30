'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')

class SendgridEmailValidation extends Model {
  get jsonFields() {
    return ['sendgrid_response']
  }
}

module.exports = SendgridEmailValidation
