'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')
const Database = use('Database');

class CreateViewSendoutBoardsSchema extends Schema {
  up () {
    this.schedule(async (transaction) => {
      const createView = `CREATE OR REPLACE VIEW v_weekly_sendout_board
        as
        select daily_totals.recruiter_id, 
        vsr.regional, 
        vsr.coach, 
        vsr.recruiter, 
        round((vscg.goal / 5::float)) as daily,
        sum(daily_totals.m) as m, 
        sum(daily_totals.t) as t,
        sum(daily_totals.w) as w,
        sum(daily_totals.th) as th,
        sum(daily_totals.f) as f,
        vscg.goal,
        sum(daily_totals.total) as total,
        case when (sum(daily_totals.total) - vscg.goal) > 0  then (sum(daily_totals.total) - vscg.goal) else 0 end as surplus,
        case when (sum(daily_totals.total) - vscg.goal) > 0  then sum(daily_totals.total) else 0 end as adjusted
        from v_sendout_recruiters vsr
        left join (select recruiter_id, board_date, total,
        CASE 
                WHEN EXTRACT(DOW FROM board_date::date)=1 THEN total else 0
        end as M,
        CASE 
                WHEN EXTRACT(DOW FROM board_date::date)=2 THEN total else 0
        end as T,
        CASE 
                WHEN EXTRACT(DOW FROM board_date::date)=3 THEN total else 0
        end as W,
        CASE 
                WHEN EXTRACT(DOW FROM board_date::date)=4 THEN total else 0
        end as TH,
        CASE 
                WHEN EXTRACT(DOW FROM board_date::date)=5 THEN total else 0
        end as F from v_sendout_dailys) as daily_totals on daily_totals.recruiter_id = vsr.recruiter_id
        left join v_sendout_current_goals vscg on vscg.recruiter_id = vsr.recruiter_id
        group by daily_totals.recruiter_id, vsr.regional, vsr.coach, vsr.recruiter, vscg.goal 
        order by coach;`;
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

module.exports = CreateViewSendoutBoardsSchema
