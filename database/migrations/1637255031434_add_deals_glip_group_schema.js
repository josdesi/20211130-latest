'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class AddDealsGlipGroupSchema extends Schema {
  up () {
    this.schedule(async (transaction) => {
      await transaction.table('module_presets_configs')
        .insert([
          {
            id: 'dealsGlipConfig',
            data: {
              groupId: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJvdCI6InUiLCJvaSI6IjEzODEzMDQ4MDMzMzEiLCJpZCI6IjEzNDkwNjY3NzkifQ.pqfnYNAb9uRpAPtLy9uiSjAON8fxqaEuyjDapVi7aWE',
            }
          }
        ]);
    });
  }

  down () {
    this.schedule(async (transaction) => {
      await transaction.table('module_presets_configs')
        .where('id', 'dealsGlipConfig')
        .delete();
    });
  }
}

module.exports = AddDealsGlipGroupSchema
