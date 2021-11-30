'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');
const Config = use('Adonis/Src/Config');

class AddTimezonesModulePresetsConfigsSchema extends Schema {
  up () {
    this.schedule(async (transaction) => {
      await transaction.table('module_presets_configs')
        .insert([
          {
            id: Config.get('modulePresetConfig.timezone.key'),
            data: Config.get('modulePresetConfig.timezone.data'),
          },
        ]);
    });
  }

  down () {
    this.schedule(async (transaction) => {
      await transaction.table('module_presets_configs')
        .where('id', Config.get('modulePresetConfig.timezone.key'))
        .delete();
    });
  }
}

module.exports = AddTimezonesModulePresetsConfigsSchema
