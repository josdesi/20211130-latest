'use strict';

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model');

class CompanyChangeLog extends Model {
  get jsonFields() {
    return ['payload'];
  }

  static boot() {
    super.boot();
    this.addTrait('@provider:Jsonable');
  }
}

module.exports = CompanyChangeLog;
