'use strict'

/** @type {import('@adonisjs/lucid/src/Schema')} */
const Schema = use('Schema')

class WeeklyCutoffSchema extends Schema {
  up () {
    this.raw(`
    CREATE OR REPLACE PROCEDURE boards_weekly_cutoff(
      )
    LANGUAGE 'sql'
    AS $BODY$
    
      insert into fee_agreements_weekly_board_history (recruiter_id, initials, recruiter, regional_alias, coach_alias, m, t, w, th, f, total, user_id, m_s, t_s, w_s, th_s, f_s, total_s, cutoff_date)	
      select recruiter_id, initials, recruiter, regional_alias, coach_alias, m, t, w, th, f, total, user_id, m_s, t_s, w_s, th_s, f_s, total_s, now() from v_fee_agreements_weekly_board;
      
      insert into sendout_board_histories
      (recruiter_id, regional, coach, recruiter, daily, m, t, w, th, f, goal, total, surplus, adjusted, cutoff_date, created_at, updated_at)
      SELECT recruiter_id, regional, coach, recruiter, daily, m, t, w, th, f, goal, total, surplus, adjusted, now(), now(),now()
        FROM v_weekly_sendout_board;

    $BODY$;
    `);
  }

  down () {
    this.table('weekly_cutoffs', (table) => {
      // reverse alternations
    })
  }
}

module.exports = WeeklyCutoffSchema
