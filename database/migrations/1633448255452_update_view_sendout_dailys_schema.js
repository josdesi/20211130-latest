'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')
const Database = use('Database');

class CreateViewSendoutDailysSchema extends Schema {
  up () {
    this.schedule(async (transaction) => {
      const createView = `CREATE OR REPLACE VIEW v_sendout_dailys as select recruiter_id,
            regional,
            coach,
            recruiter,
            to_char(sendout.board_date::date, 'YYYY-MM-DD') as board_date,
            count(id) as total
          from v_sendout_recruiters as vsr
            left join (select id, board_date, sendout_type_id, job_order_accountable_id, candidate_accountable_id
            from sendouts
            WHERE board_date between date_trunc('week', timezone('US/Central', now()::timestamptz))::date and (date_trunc('week', timezone('US/Central', now()::timestamptz))+ '6 days'::interval)::date AND sendout_type_id = 1 AND deleted = FALSE) sendout ON (vsr.recruiter_id = sendout.job_order_accountable_id or vsr.recruiter_id = sendout.candidate_accountable_id)
        group by recruiter_id, regional, coach, recruiter, to_char
        (sendout.board_date::date, 'YYYY-MM-DD');`;
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

module.exports = CreateViewSendoutDailysSchema
