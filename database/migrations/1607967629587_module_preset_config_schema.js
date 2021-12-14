'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')
const Config = use('Adonis/Src/Config');
const Database = use('Database')

class ModulePresetConfigSchema extends Schema {
  up () {
    this.schedule(async (transaction) => {
      const configMigration = [
        { id: Config.get('modulePresetConfig.migration.key'), data: JSON.stringify(Config.get('modulePresetConfig.migration.data')) },
      ];
      await Database.table('module_presets_configs').transacting(transaction).insert(configMigration);
    });
  }

  down () {
    this.table('module_presets_configs', (table) => {
      // reverse alternations
    })
  }
}

module.exports = ModulePresetConfigSchema
