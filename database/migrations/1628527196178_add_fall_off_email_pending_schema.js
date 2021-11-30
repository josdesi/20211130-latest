'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')
const SendgridConfigurationSeeder = require('../seeds/SendgridConfigurationSeeder');
const { placementEmailTemplates } = use('App/Utils/PlacementUtils'); 

class AddFallOffEmailPendingSchema extends Schema {
  up () {
    this.schedule(async (transaction) => {
      const sendgridConfigSeeder = new SendgridConfigurationSeeder();
      try {
        await sendgridConfigSeeder.run(transaction, placementEmailTemplates);
        await transaction.commit();
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    });
  }

  down () {
    this.schedule(async (transaction) => {
      await transaction.table('sendgrid_configurations')
        .whereIn('template_id', [
           placementEmailTemplates.PlacementOnFallOffRequest.template_id, 
           placementEmailTemplates.PlacementOnFallOffCompleted.template_id,
           placementEmailTemplates.PlacementOnRevertFallOffRequest.template_id,
           placementEmailTemplates.PlacementOnRevertFallOffCompleted.template_id 
        ])
        .delete();
    });
  }
}

module.exports = AddFallOffEmailPendingSchema
