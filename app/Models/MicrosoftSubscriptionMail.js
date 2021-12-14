'use strict';

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model');

class MicrosoftSubscriptionMail extends Model {
  static get connection() {
    return 'pg_analytics';
  }

  get jsonFields() {
    return ['recipients', 'cc_recipients'];
  }

  static boot() {
    super.boot();
    this.addTrait('@provider:Jsonable');
  }
}

module.exports = MicrosoftSubscriptionMail;
