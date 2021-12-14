'use strict';

const { activityLogTypes } = use('App/Helpers/Globals');

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema');
const Database = use('Database');

class ActivityLogTypeSchema extends Schema {
  up() {
    this.table('activity_log_types', (table) => {
      // alter table
      table.specificType('available', 'smallint').defaultTo(1);
    });

    this.schedule(async (trx) => {
      const query = `
        UPDATE activity_log_types
          SET available = 0
        WHERE activity_log_types.id IN (${activityLogTypes.Sendout}, ${activityLogTypes.OfferAccepted}, ${activityLogTypes.Sendover})
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
    this.table('activity_log_types', (table) => {
      // reverse alternations
      table.dropColumn('available');
    });
  }
}

module.exports = ActivityLogTypeSchema;
