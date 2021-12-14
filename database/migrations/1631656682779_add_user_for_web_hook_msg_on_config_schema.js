'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');
const Config = use('Adonis/Src/Config');

class AddUserForWebHookMsgOnConfigSchema extends Schema {
  up () {
    this.schedule(async (transaction) => {
      await transaction.table('module_presets_configs')
        .insert([
          {
            id: Config.get('modulePresetConfig.userGlipForWebHookMsg.key'),
            data: Config.get('modulePresetConfig.userGlipForWebHookMsg.data'),
          },
        ]);
    });
  }

  down () {
    this.schedule(async (transaction) => {
      await transaction.table('module_presets_configs')
        .where('id', Config.get('modulePresetConfig.userGlipForWebHookMsg.key'))
        .delete();
    });
  }
}

module.exports = AddUserForWebHookMsgOnConfigSchema
