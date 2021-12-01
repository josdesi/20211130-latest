'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');
const Database = use('Database');
const { SendgridSuppressionGroups } = use('App/Helpers/Globals');

class ModulePresetsConfigSchema extends Schema {
  up() {
    this.schedule(async (transaction) => {
      await Database.table('module_presets_configs')
        .transacting(transaction)
        .insert([
          {
            id: SendgridSuppressionGroups.Bulking.key,
            data: SendgridSuppressionGroups.Bulking.id,
          },
        ]);
    });
  }

  down() {}
}

module.exports = ModulePresetsConfigSchema;
