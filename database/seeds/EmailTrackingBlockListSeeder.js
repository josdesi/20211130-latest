'use strict';

/*
|--------------------------------------------------------------------------
| PermissionSeeder
|--------------------------------------------------------------------------
|
| Make use of the Factory instance to seed database with dummy data or
| make use of Lucid models directly.
|
*/

/** @type {import('@adonisjs/lucid/src/Factory')} */
const { getOnConflictUpdateQuery } = use('App/Helpers/QueryUtils');
const Database = use('Database');

class EmailTrackingBlockListSeeder {
  async run(externalTransaction) {
    const transaction = externalTransaction ? externalTransaction : await Database.beginTransaction();

    try {
      const emailBlockList = require('../data/EmailTrackingBlockList.json');
      const emailBlockListData = emailBlockList.map(({ email, notes }) => {
        return {
          email,
          block_to: true,
          block_from: true,
          created_at: 'now()',
          updated_at: 'now()',
          notes: notes ? notes : 'Created from migration',
        };
      });

      const insertQuery = Database.table('email_tracking_block_lists').insert(emailBlockListData);
      const conflictQuery = getOnConflictUpdateQuery(
        ['email'],
        ['email', 'block_to', 'block_from', 'updated_at', 'notes'],
        'email_tracking_block_lists.email = excluded.email'
      );

      await transaction.raw(`${insertQuery.toQuery()} ${conflictQuery}`);

      !externalTransaction && (await transaction.commit());
    } catch (error) {
      !externalTransaction && (await transaction.rollback());
      throw error;
    }
  }
}

module.exports = EmailTrackingBlockListSeeder;
