'use strict';

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');
const Database = use('Database');

class ModulePresetsConfigSchema extends Schema {
  up() {
    this.schedule(async (transaction) => {
      await Database.table('module_presets_configs')
        .transacting(transaction)
        .insert([
          {
            id: 'sendoversUnconvertedEmail',
            data: {
              to: 'roberto.deanda@gogpac.com',
              forLastNDays: 1
            },
          },
        ]);
    });
  }

  down() {}
}

module.exports = ModulePresetsConfigSchema;
