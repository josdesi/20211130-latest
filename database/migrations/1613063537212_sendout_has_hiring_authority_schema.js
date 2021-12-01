'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class SendoutHasHiringAuthoritySchema extends Schema {
  up () {
    this.rename('send_out_has_hiring_authorities', 'sendout_has_hiring_authorities');
  }

  down () {
    this.rename('sendout_has_hiring_authorities', 'send_out_has_hiring_authorities');
  }
}

module.exports = SendoutHasHiringAuthoritySchema
