'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class ModulePresetConfigsSchema extends Schema {
  up () {
    this.schedule(async (transaction) => {
      await transaction.table('module_presets_configs')
        .insert([
          {
            id: 'coachesGlipConfig',
            data: {
              groupId: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJvdCI6InUiLCJvaSI6IjEyMjEyMjQ0ODg5NjMiLCJpZCI6IjE0MDY1MDA4OTEifQ.YCE3y51AUjiz5sR4Y_Xny3-640cYy-7X03G1xg1-4D8',
            }
          },
          {
            id: 'gpacAllGlipConfig',
            data: {
              groupId: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJvdCI6InUiLCJvaSI6IjEyMjEyMjQ0ODg5NjMiLCJpZCI6IjE0MDY1MDA4OTEifQ.YCE3y51AUjiz5sR4Y_Xny3-640cYy-7X03G1xg1-4D8',
            }
          },
        ]);
    });
  }

  down () {
    this.table('module_config_repositories', (table) => {
      // reverse alternations
    })
  }
}

module.exports = ModulePresetConfigsSchema
