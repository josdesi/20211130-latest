'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')
const SendgridConfigurationSeeder = require('../seeds/SendgridConfigurationSeeder');
const { placementEmailTemplates } = use('App/Utils/PlacementUtils'); 
class AddEmailsPlacementSchema extends Schema {
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
  }
}

module.exports = AddEmailsPlacementSchema
