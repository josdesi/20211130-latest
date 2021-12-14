'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class ModuleConfigAddCustomGlipEventsSchema extends Schema {
  up () {
    this.schedule(async (transaction) => {
      await transaction.table('module_presets_configs')
        .insert([
          {
            id: 'placementOnDealGlips',
            data: JSON.stringify([
              {
                name: 'Deals',
                groupId:'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJvdCI6InUiLCJvaSI6IjEzODEzMDQ4MDMzMzEiLCJpZCI6IjEzNDkwNjY3NzkifQ.pqfnYNAb9uRpAPtLy9uiSjAON8fxqaEuyjDapVi7aWE'  
              },
              {
                name: 'Team Gogpac',
                groupId:'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJvdCI6InUiLCJvaSI6IjEyMjEyMjQ0ODg5NjMiLCJpZCI6IjE0MDY1MDA4OTEifQ.YCE3y51AUjiz5sR4Y_Xny3-640cYy-7X03G1xg1-4D8'  
              }
            ])
          },
          {
            id: 'sendoutOnCreationOrConvertionGlips',
            data: JSON.stringify([
              {
                name: 'Coaches',
                groupId:'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJvdCI6InUiLCJvaSI6IjEyMjEyMjQ0ODg5NjMiLCJpZCI6IjE0MDY1MDA4OTEifQ.YCE3y51AUjiz5sR4Y_Xny3-640cYy-7X03G1xg1-4D8'  
              }
            ])
          },
          {
            id: 'feeOnSignedGlips',
            data: JSON.stringify([
              {
                name: 'Coaches',
                groupId:'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJvdCI6InUiLCJvaSI6IjEyMjEyMjQ0ODg5NjMiLCJpZCI6IjE0MDY1MDA4OTEifQ.YCE3y51AUjiz5sR4Y_Xny3-640cYy-7X03G1xg1-4D8'  
              },
              {
                name: 'Team Gogpac',
                groupId:'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJvdCI6InUiLCJvaSI6IjEyMjEyMjQ0ODg5NjMiLCJpZCI6IjE0MDY1MDA4OTEifQ.YCE3y51AUjiz5sR4Y_Xny3-640cYy-7X03G1xg1-4D8'  
              }
            ])
          }
        ]);
    });
  }

  down () {
    this.schedule(async (transaction) => {
      await transaction.table('module_presets_configs')
        .whereIn('id', ['placementOnDealGlips','sendoutOnCreationOrConvertionGlips','feeOnSignedGlips'])
        .delete();
    });
  }
}

module.exports = ModuleConfigAddCustomGlipEventsSchema
