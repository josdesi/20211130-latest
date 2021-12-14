'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')
const Database = use('Database')
class ModulePresetConfigsSchema extends Schema {
  up () {
    this.schedule(async (transaction) => {
      await Database.table('module_presets_configs')
        .transacting(transaction)
        .insert([
          {
            id: 'usersEmailsWithAppropiableInventory',
            data: JSON.stringify([
              'shea.geelan@gogpac.com',
              'valentina.esquivel@gogpac.com',
              'gpc_migrations@gpac.com'
            ])
          },
        ]);
    });
  }

  down () {
    this.table('module_preset_configs', (table) => {
      // reverse alternations
    })
  }
}

module.exports = ModulePresetConfigsSchema
