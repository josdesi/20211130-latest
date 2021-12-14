'use strict';

const { activityLogTypes } = use('App/Helpers/Globals');

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');
const Database = use('Database');

class ActivityLogTypeSchema extends Schema {
  up() {
    this.schedule(async (trx) => {
      const query = `
        UPDATE activity_log_types
          SET available = 0
        WHERE activity_log_types.id IN (${activityLogTypes.Interview}, ${activityLogTypes.NoOffer}, ${activityLogTypes.Declined}, ${activityLogTypes.ConversionOfSendover})
      `;

      try {
        await Database.raw(query).transacting(trx);
        await trx.commit();
      } catch (error) {
        await trx.rollback();
        throw error;
      }
    });
  }

  down() {

  }
}

module.exports = ActivityLogTypeSchema;
