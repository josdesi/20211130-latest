'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')
const Config = use('Adonis/Src/Config');

class AddReferenceEmailConfigSchema extends Schema {
  up () {
    this.schedule(async (transaction) => {
      await transaction.table('module_presets_configs')
        .insert([
          {
            id: Config.get('modulePresetConfig.referenceRelease.key'),
            data: Config.get('modulePresetConfig.referenceRelease.data'),
          },
        ]);
    });
  }

  down () {
    this.schedule(async (transaction) => {
      await transaction.table('module_presets_configs')
        .where('id', Config.get('modulePresetConfig.referenceRelease.key'))
        .delete();
    });
  }
}

module.exports = AddReferenceEmailConfigSchema
