'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')
const Database = use('Database');

class CreateViewSendoutBoardsSchema extends Schema {
  up () {
    this.schedule(async (transaction) => {
      const createView = `CREATE OR REPLACE VIEW v_weekly_sendout_board
        AS SELECT daily_totals.recruiter_id,
            vsr.regional,
            vsr.coach,
            vsr.recruiter,
            round(vscg.goal::double precision / 5::double precision) AS daily,
            sum(daily_totals.m) AS m,
            sum(daily_totals.t) AS t,
            sum(daily_totals.w) AS w,
            sum(daily_totals.th) AS th,
            sum(daily_totals.f) AS f,
            vscg.goal,
            sum(daily_totals.total) AS total,
                CASE
                    WHEN (sum(daily_totals.total) - vscg.goal::numeric) > 0::numeric THEN sum(daily_totals.total) - vscg.goal::numeric
                    ELSE 0::numeric
                END AS surplus,
                CASE
                    WHEN (sum(daily_totals.total) - vscg.goal::numeric) > 0::numeric THEN sum(daily_totals.total)
                    ELSE vscg.goal::numeric
                END AS adjusted,
            vsr.regional_alias,
            vsr.coach_alias
          FROM v_sendout_recruiters vsr
            LEFT JOIN ( SELECT v_sendout_dailys.recruiter_id,
                    v_sendout_dailys.board_date,
                    v_sendout_dailys.total,
                        CASE
                            WHEN date_part('dow'::text, v_sendout_dailys.board_date::date) = 1::double precision THEN v_sendout_dailys.total
                            ELSE 0::bigint
                        END AS m,
                        CASE
                            WHEN date_part('dow'::text, v_sendout_dailys.board_date::date) = 2::double precision THEN v_sendout_dailys.total
                            ELSE 0::bigint
                        END AS t,
                        CASE
                            WHEN date_part('dow'::text, v_sendout_dailys.board_date::date) = 3::double precision THEN v_sendout_dailys.total
                            ELSE 0::bigint
                        END AS w,
                        CASE
                            WHEN date_part('dow'::text, v_sendout_dailys.board_date::date) = 4::double precision THEN v_sendout_dailys.total
                            ELSE 0::bigint
                        END AS th,
                        CASE
                            WHEN date_part('dow'::text, v_sendout_dailys.board_date::date) = 5::double precision THEN v_sendout_dailys.total
                            ELSE 0::bigint
                        END AS f
                  FROM v_sendout_dailys) daily_totals ON daily_totals.recruiter_id = vsr.recruiter_id
            LEFT JOIN v_sendout_current_goals vscg ON vscg.recruiter_id = vsr.recruiter_id
          GROUP BY daily_totals.recruiter_id, vsr.regional, vsr.coach, vsr.recruiter, vscg.goal, vsr.regional_alias, vsr.coach_alias
          ORDER BY vsr.coach;`;
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
