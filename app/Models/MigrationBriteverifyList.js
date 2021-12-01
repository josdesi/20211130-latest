'use strict';

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model');

class MigrationBriteverifyList extends Model {
  get jsonFields() {
    return ['validation_payload'];
  }

  static boot() {
    super.boot();
    this.addTrait('@provider:Jsonable');
  }
}

module.exports = MigrationBriteverifyList;
