'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')
const Database = use('Database');

class CreateViewSendoutBoardHistoriesSchema extends Schema {
  up () {
    this.schedule(async (transaction) => {
      const createView = `create or replace view v_sendout_board_histories as SELECT *,
        concat('Region', ' ', split_part(regional::text, ' '::text, 1)) AS regional_alias,
        split_part(coach::text, ' '::text, 1) AS coach_alias,
        extract(week from cutoff_date::date::timestamp) as nweek,
        concat(TO_CHAR(cutoff_date::date::timestamp, 'Month'), 'Week ', extract(week from cutoff_date::date::timestamp)) as week
        from sendout_board_histories;`;
      try {
        await Database.raw(createView).transacting(transaction);
        await transaction.commit();
      } catch(error) {
        await transaction.rollback();
        throw error;
      }
    });
  }
}

module.exports = CreateViewSendoutBoardHistoriesSchema
