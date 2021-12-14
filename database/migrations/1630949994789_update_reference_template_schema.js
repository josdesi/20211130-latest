'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')
const Config = use('Adonis/Src/Config');

class UpdateReferenceTemplateSchema extends Schema {
  up () {
    this.schedule(async (transaction) => {
      await transaction.table('module_presets_configs')
      .where('id',Config.get('modulePresetConfig.referenceRelease.key'))
      .update({
        data: Config.get('modulePresetConfig.referenceRelease.data'),
      });
    });
  }


  down () {
  }
}

module.exports = UpdateReferenceTemplateSchema
