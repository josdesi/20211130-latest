'use strict';

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model');

class BulkEmailSendgridWebhookEvent extends Model {
  get jsonFields() {
    return ['raw_event'];
  }

  static boot() {
    super.boot();
    this.addTrait('@provider:Jsonable');
  }
}

module.exports = BulkEmailSendgridWebhookEvent;
