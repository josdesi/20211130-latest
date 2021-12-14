'use strict';
const Database = use('Database');
const FORMAT_WEEK_DATE = 'YYYY/MM/DD';
const SENDOUTS_DASHBOARD_FIELDS = `
  ROUND(SUM(daily)) daily,
  SUM(m) M,
  SUM(t) T,
  SUM(w) W,
  SUM(th) TH,
  SUM(f) F,
  SUM(goal) goal,
  SUM(total) actual,
  SUM(adjusted) adjusted,
  CASE WHEN SUM(adjusted) = 0 THEN ' ' ELSE CONCAT(ROUND(SUM(total)::numeric/SUM(adjusted)::numeric*100),' %') END percentage`;

class SendoutDashboard {
  flattenRecords(records) {
    const sendoutRecords = records.filter((item) => item.coach === ' ');
    sendoutRecords.forEach((item) => {
      const coaches = records.filter((coach) => coach.regional === item.regional && coach.coach != ' ');
      item.coaches = [...coaches];
    });
    return sendoutRecords;
  }

  getWeeklyData(week) {
    const isWeeklyHistory = week !== 'undefined';
    const table = isWeeklyHistory ? 'v_sendout_board_histories' : 'v_weekly_sendout_board';
    return [isWeeklyHistory, table];
  }

  addFilterByDate(query, week) {
    query.where(Database.raw(`to_char(cutoff_date,'${FORMAT_WEEK_DATE}')`), '=', week);
  }

  getGpacQuery(week) {
    const [isWeeklyHistory, table] = this.getWeeklyData(week);

    let query = Database.select(
      Database.raw(`
        'gpac' team,
        ' ' regional,
        ' ' coach        
      `),
      Database.raw(SENDOUTS_DASHBOARD_FIELDS)
    ).from(table, 'brd');
    if (isWeeklyHistory) this.addFilterByDate(query, week);

    return query;
  }

  getRegionalQuery(week) {
    const [isWeeklyHistory, table] = this.getWeeklyData(week);
    const query = Database.select(
      Database.raw(`
        'regional' team,
        regional_alias regional,
        ' ' coach
      `),
      Database.raw(SENDOUTS_DASHBOARD_FIELDS)
    ).from(table, 'brd');
    if (isWeeklyHistory) this.addFilterByDate(query, week);

    query.groupBy('regional_alias');
    return query;
  }

  getCoachQuery(week) {
    const [isWeeklyHistory, table] = this.getWeeklyData(week);

    const query = Database.select(
      Database.raw(`
        coach team,
        regional_alias regional,
        coach_alias coach
      `),
      Database.raw(SENDOUTS_DASHBOARD_FIELDS)
    ).from(table, 'brd');
    if (isWeeklyHistory) this.addFilterByDate(query, week);

    query.groupBy(['regional_alias', 'coach', 'coach_alias']);
    return query;
  }

  getDashboardQuery(week) {
    return Database.select('*')
      .from(
        Database.union(this.getGpacQuery(week))
          .union(this.getRegionalQuery(week))
          .union(this.getCoachQuery(week))
          .as('item')
      )
      .orderBy('regional')
      .orderBy('coach');
  }
}

module.exports = {
  SendoutDashboard,
  FORMAT_WEEK_DATE
};
