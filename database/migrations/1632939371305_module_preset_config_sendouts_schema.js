'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')
const Config = use('Adonis/Src/Config');
const Database = use('Database');

class ModulePresetConfigSendoutsSchema extends Schema {
  up () {
    this.schedule(async (transaction) => {
      await Database.table('module_presets_configs')
        .transacting(transaction)
        .insert([
          {
            id: Config.get('modulePresetConfig.sendoutsBoardConfiguration.key'),
            data: Config.get('modulePresetConfig.sendoutsBoardConfiguration.data'),
          },
        ]);
    });
  }

  down () {}
}

module.exports = ModulePresetConfigSendoutsSchema
