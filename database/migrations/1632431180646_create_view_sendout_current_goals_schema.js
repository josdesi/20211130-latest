'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')
const Database = use('Database');

class CreateViewSendoutCurrentGoalsSchema extends Schema {
  up () {
    this.schedule(async (transaction) => {
      const createView = `CREATE OR REPLACE VIEW v_sendout_current_goals as SELECT weeks_by_recruiter.recruiter_id, weeks_by_recruiter.name,
        CASE
        WHEN weeks_by_recruiter.number_of_weeks BETWEEN 1 AND 2 THEN 0
        WHEN weeks_by_recruiter.number_of_weeks BETWEEN 3 AND 4 THEN 1
        WHEN weeks_by_recruiter.number_of_weeks BETWEEN 5 AND 6 THEN 2
        WHEN weeks_by_recruiter.number_of_weeks >= 7 THEN 3
        ELSE 0
        END AS goal
        FROM (SELECT ( ( Now() :: DATE - recruiters.start_date :: DATE ) / 7 ) AS
        number_of_weeks,
        recruiters.recruiter_id,
        recruiters.recruiter AS name
        FROM v_sendout_recruiters recruiters) AS weeks_by_recruiter;`;
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

module.exports = CreateViewSendoutCurrentGoalsSchema
