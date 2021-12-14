'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')
const Database = use('Database');

class CreateViewSendoutMontlySchema extends Schema {
  up () {
    this.schedule(async (transaction) => {
      const createView = `create or replace view v_sendout_montly as SELECT vsr.recruiter_id,
      vsr.regional_id,
      vsr.coach_id,
      count(sendout.id) AS total
     FROM v_users vsr
       LEFT JOIN ( SELECT sendouts.id,
              sendouts.board_date,
              sendouts.sendout_type_id,
              sendouts.job_order_accountable_id,
              sendouts.candidate_accountable_id
             FROM sendouts
            WHERE  DATE_TRUNC('month',now()) =  DATE_TRUNC('month', board_date) 
          and sendouts.sendout_type_id = 1 AND sendouts.deleted = false) sendout 
          ON vsr.recruiter_id = sendout.job_order_accountable_id OR vsr.recruiter_id = sendout.candidate_accountable_id
      where vsr.user_status_id = 1 and recruiter_id is not null and coach_id is not null and regional_id is not null
    GROUP BY vsr.recruiter_id, vsr.coach_id, vsr.regional_id;`;
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

module.exports = CreateViewSendoutMontlySchema