'use strict';

//Utils
const { DateFormats } = use('App/Helpers/Globals');
const moment = use('moment');
const Database = use('Database');

const methods = {
  /**
   * Allows the batch insertion of row to the database using lucid models
   *
   * @summart This method exposes the logic of doing a batch insert, since lucid default 'createMany' makes usag of multiple inserts, making the task of batch insert redudant
   *
   * @param {Object} model - The lucid database model, e.g.: User, Company, EmailHistory, PersonalInformation
   * @param {Object[]} data - The rows, what will be inserting to the database, make sure it follows the model structure
   * @param {Database} trx - External transaction object, the transaction should be controlled out side this method, since this method could be part of a bigger scope
   * @param {Boolean=true} useTimestamps - This method adds automatically the timestamps to each object in @data param, but can be disabled if desired so
   *
   * @return {Object} An array of objects recently added, obtaining by using 'returning' at Query level
   */
  async batchInsert(model, data, trx, useTimestamps = true) {
    if (useTimestamps) {
      const now = moment.utc().format(DateFormats.SystemDefault);
      for (const row of data) {
        row.created_at = now;
        row.updated_at = now;
      }
    }

    return await Database.table(model.table).transacting(trx).insert(data, ['*']);
  },
  /**
   * Allows an easier & quicker creation of 'on conflict update' or upserts flow
   *
   * @summary This method returns a string (sql) that can be used to substitute the missing .onConflict .merge .where from lucid and tries to replicate the Knex implementation
   *
   * @param {String[]} conflictColumns - An string array of which conflict columns will be used for
   * @param {String[]} mergeColumns -  An string array of which merge columns will be used for, automatically add the 'excluded' columns counterpart
   * @param {String} whereClause - An string containing the where clause, e.g.: 'users.email = excluded.email', sadly this one needs to be put manually
   *
   * @return {Object} An array of objects recently added, obtaining by using 'returning' at Query level
   */
  getOnConflictUpdateQuery(conflictColumns = [], mergeColumns = [], whereClause = '') {
    const parsedConflictedColumns = conflictColumns.join(',');
    const parsedMergeColumns = mergeColumns.map((column) => `${column} = excluded.${column}`).join(',');

    const query = `ON CONFLICT (${parsedConflictedColumns}) DO UPDATE SET ${parsedMergeColumns} WHERE ${whereClause}`;

    return query;
  },
};

module.exports = methods;
