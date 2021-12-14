'use strict';

//Utils
const Antl = use('Antl');
const moment = use('moment');
const appInsights = require('applicationinsights');
const Database = use('Database');
const {
  userRoles,
  granularityTimes,
  colorsFromEpic,
  BulkEmailScopeTypes,
  SendgridEventTypes,
  SendgridBouncedEvents,
  DateFormats,
} = use('App/Helpers/Globals');
const { groupBy, sumBy, values, uniq, keyBy, differenceBy } = use('lodash');

// Repositories
const RecruiterRepository = new (use('App/Helpers/RecruiterRepository'))();

const Marketing = BulkEmailScopeTypes.Marketing;
const Recruiting = BulkEmailScopeTypes.Recruiting;
const Global = BulkEmailScopeTypes.Global;

class BulkEmailDashboardRepository {
  joinStringForQueryUsage(array) {
    let finalString = '(';
    for (const string of array) {
      if (finalString !== '(') {
        finalString = `${finalString},`;
      }
      finalString = `${finalString}'${string}'`;
    }
    finalString = `${finalString})`;

    return finalString;
  }

  getBulkEventConditionals() {
    const deliveredConditionals = `(sendgrid_events.event = '${SendgridEventTypes.delivered}')`;
    const openConditionals = `(sendgrid_events.event = '${SendgridEventTypes.open}')`;
    const bouncedConditionals = `(sendgrid_events.event in ${this.joinStringForQueryUsage(SendgridBouncedEvents)})`;
    const spamConditionals = `(sendgrid_events.event = '${SendgridEventTypes.spamreport}' or sendgrid_events.event = '${SendgridEventTypes.group_unsubscribe}')`;

    return [deliveredConditionals, openConditionals, bouncedConditionals, spamConditionals];
  }

  /**
   * @mainmethod totalBulkSent
   *
   * @summary Returns the total of bulk sents, divided in marketing, recruiting, global & reached people
   */
  async totalBulkSent(userFilters, dateRange) {
    try {
      const [startDate, endDate] = dateRange;
      const totalBulksMarketingPromise = this.getTotalBulkSent(userFilters, startDate, endDate, Marketing);
      const totalBulksRecruitingPromise = this.getTotalBulkSent(userFilters, startDate, endDate, Recruiting);
      const totalBulksGlobalPromise = this.getTotalBulkSent(userFilters, startDate, endDate, Global);

      const [totalBulksMarketing, totalBulksRecruiting, totalBulksGlobal] = await Promise.all([
        totalBulksMarketingPromise,
        totalBulksRecruitingPromise,
        totalBulksGlobalPromise,
      ]);

      const data = this.formatTotalBulkSent(totalBulksMarketing, totalBulksRecruiting, totalBulksGlobal);
      return {
        code: 200,
        data,
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      return {
        code: 500,
        message: Antl.formatMessage('messages.error.internalServer', {
          action: 'getting',
          entity: 'bulk dashboard info',
        }),
      };
    }
  }

  /**
   * @mainmethod totalBulkSent
   *
   * @summary Returns the total of bulk sents, divided in marketing, recruiting, global & reached people
   */
  async getTotalBulkSent(userFilters, startDate, endDate, scope) {
    const totalBulkSentQuery = this.getTotalBulkSentQuery(startDate, endDate, scope);

    const selectAggregate = [
      Database.raw(`SUM(sq.total) as bulks`),
      Database.raw(`SUM(sq.delivered_emails) as delivered_emails`),
    ];

    const uniqueUserRoleQuery = this.getUniqueUserRoleQuery();

    const query = Database.from('v_users as usr')
      .select([...selectAggregate, 'usr.id', 'usr.user_name as full_name'])
      .joinRaw(uniqueUserRoleQuery).joinRaw(`
        inner join (${totalBulkSentQuery})
        sq on usr.id = sq.${userFilters.coachId ? 'created_by' : 'coach_id'}
    `);
    await this.applyWhereClauseUser(userFilters, query, 'usr', 'id', false);
    this.applyGroupUsersClause(query, userFilters.coachId);

    return await query;
  }

  /**
   * @mainmethod totalBulkSent
   *
   * @summary Returns the total of bulk sents, divided in marketing, recruiting, global & reached people
   */
  getTotalBulkSentQuery(startDate, endDate, scope) {
    const [deliveredConditionals] = this.getBulkEventConditionals();

    const query = Database.from('email_histories as eh').select([
      'eh.created_by',
      Database.raw(`CASE WHEN dig.coach_id is null THEN eh.created_by ELSE dig.coach_id END as coach_id`),
      Database.raw(`COUNT(DISTINCT(eh.id)) as total`),
      Database.raw(`COUNT(sendgrid_events.email) filter (where ${deliveredConditionals}) as delivered_emails`),
    ]);

    query.joinRaw(
      `left join (
          select * from (select eh.id, fortpac_events.email, fortpac_events.type as event from email_histories eh, jsonb_to_recordset(eh.emails_blocked || eh.emails_invalid) as fortpac_events(email text, type text)
          union all
          select eh.id, beswe.email, beswe.event from email_histories eh inner join bulk_email_sendgrid_webhook_events beswe on beswe.sendgrid_id = eh.sendgrid_id
        ) as sendgrid_events
      ) as sendgrid_events on sendgrid_events.id = eh.id`
    );

    query.joinRaw(
      `left join (select DISTINCT coach_id, recruiter_id from recruiter_has_industries) as dig on dig.recruiter_id = eh.created_by`
    );

    query.where('bulk_email_scope_type_id', scope);
    this.applyQueryWhereClauseDate(startDate, endDate, query, 'eh');

    query.groupByRaw('eh.created_by, CASE WHEN dig.coach_id is null THEN eh.created_by ELSE dig.coach_id END');

    return query;
  }

  /**
   * @mainmethod totalBulkSent
   *
   * @summary Returns the total of bulk sents, divided in marketing, recruiting, global & reached people
   */
  formatTotalBulkSent(totalBulksMarketing, totalBulksRecruiting, totalBulksGlobal) {
    const totalMarketing = sumBy(totalBulksMarketing, (val) => Number(val.bulks));
    const totalRecruiting = sumBy(totalBulksRecruiting, (val) => Number(val.bulks));
    const totalGlobal = sumBy(totalBulksGlobal, (val) => Number(val.bulks));

    const deliveredMarketing = sumBy(totalBulksMarketing, (val) => Number(val.delivered_emails));
    const deliveredRecruiting = sumBy(totalBulksRecruiting, (val) => Number(val.delivered_emails));
    const deliveredGlobal = sumBy(totalBulksGlobal, (val) => Number(val.delivered_emails));
    const totalDelivered = deliveredMarketing + deliveredRecruiting + deliveredGlobal;

    return [
      {
        title: 'Marketing',
        total: totalMarketing,
        icon: 'marketingBulk',
      },
      {
        title: 'Recruiting',
        total: totalRecruiting,
        icon: 'recruitingBulk',
      },
      {
        title: 'General',
        total: totalGlobal,
        icon: 'generalBulk',
      },
      {
        title: 'Recipients Reached',
        total: totalDelivered,
        icon: 'reachedBulk',
      },
    ];
  }

  /**
   * @mainmethod totalBulkStats
   *
   * @summary Returns the total of bulk stats, meaning the ratio of how many were open, bounced, delivered & spam
   */
  async totalBulkStats(userFilters, dateRange) {
    try {
      const [startDate, endDate] = dateRange;
      const totalBulksStatsPromise = this.getTotalBulkStats(userFilters, startDate, endDate);

      const [totalBulksStats] = await Promise.all([totalBulksStatsPromise]);

      const data = this.formatTotalBulkStats(totalBulksStats);
      return {
        code: 200,
        data,
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      return {
        code: 500,
        message: Antl.formatMessage('messages.error.internalServer', {
          action: 'getting',
          entity: 'bulk dashboard info',
        }),
      };
    }
  }

  /**
   * @mainmethod totalBulkStats
   *
   * @summary Returns the total of bulk stats, meaning the ratio of how many were open, bounced, delivered & spam
   */
  async getTotalBulkStats(userFilters, startDate, endDate) {
    const totalBulkStatsQuery = this.getTotalBulkStatsQuery(startDate, endDate);

    const selectAggregate = [
      Database.raw(`SUM(sq.marketing_delivered_emails) as marketing_delivered_emails`),
      Database.raw(`SUM(sq.recruiting_delivered_emails) as recruiting_delivered_emails`),
      Database.raw(`SUM(sq.global_delivered_emails) as global_delivered_emails`),

      Database.raw(`SUM(sq.marketing_open_emails) as marketing_open_emails`),
      Database.raw(`SUM(sq.recruiting_open_emails) as recruiting_open_emails`),
      Database.raw(`SUM(sq.global_open_emails) as global_open_emails`),

      Database.raw(`SUM(sq.marketing_bounced_emails) as marketing_bounced_emails`),
      Database.raw(`SUM(sq.recruiting_bounced_emails) as recruiting_bounced_emails`),
      Database.raw(`SUM(sq.global_bounced_emails) as global_bounced_emails`),

      Database.raw(`SUM(sq.marketing_spam_emails) as marketing_spam_emails`),
      Database.raw(`SUM(sq.recruiting_spam_emails) as recruiting_spam_emails`),
      Database.raw(`SUM(sq.global_spam_emails) as global_spam_emails`),
    ];

    const uniqueUserRoleQuery = this.getUniqueUserRoleQuery();

    const query = Database.from('v_users as usr')
      .select([...selectAggregate, 'usr.id', 'usr.user_name as full_name'])
      .joinRaw(uniqueUserRoleQuery).joinRaw(`
        inner join (${totalBulkStatsQuery})
        sq on usr.id = sq.${userFilters.coachId ? 'created_by' : 'coach_id'}
    `);
    await this.applyWhereClauseUser(userFilters, query, 'usr', 'id', false);
    this.applyGroupUsersClause(query, userFilters.coachId);

    return await query;
  }

  /**
   * @mainmethod totalBulkStats
   *
   * @summary Returns the total of bulk stats, meaning the ratio of how many were open, bounced, delivered & spam
   */
  getTotalBulkStatsQuery(startDate, endDate) {
    const [deliveredConditionals, openConditionals, bouncedConditionals, spamConditionals] =
      this.getBulkEventConditionals();

    const query = Database.select([
      'eh.created_by',
      Database.raw(`CASE WHEN dig.coach_id is null THEN eh.created_by ELSE dig.coach_id END as coach_id`),
      //Delivered
      Database.raw(
        `count(sendgrid_events.email) filter (where bulk_email_scope_type_id = 1 and ${deliveredConditionals}) as marketing_delivered_emails`
      ),
      Database.raw(
        `count(sendgrid_events.email) filter (where bulk_email_scope_type_id = 2 and ${deliveredConditionals}) as recruiting_delivered_emails`
      ),
      Database.raw(
        `count(sendgrid_events.email) filter (where bulk_email_scope_type_id = 3 and ${deliveredConditionals}) as global_delivered_emails`
      ),
      //Open
      Database.raw(
        `count(DISTINCT sendgrid_events.email) filter (where bulk_email_scope_type_id = 1 and ${openConditionals}) as marketing_open_emails`
      ),
      Database.raw(
        `count(DISTINCT sendgrid_events.email) filter (where bulk_email_scope_type_id = 2 and ${openConditionals}) as recruiting_open_emails`
      ),
      Database.raw(
        `count(DISTINCT sendgrid_events.email) filter (where bulk_email_scope_type_id = 3 and ${openConditionals}) as global_open_emails`
      ),
      //Bounce
      Database.raw(
        `count(sendgrid_events.email) filter (where bulk_email_scope_type_id = 1 and ${bouncedConditionals}) as marketing_bounced_emails`
      ),
      Database.raw(
        `count(sendgrid_events.email) filter (where bulk_email_scope_type_id = 2 and ${bouncedConditionals}) as recruiting_bounced_emails`
      ),
      Database.raw(
        `count(sendgrid_events.email) filter (where bulk_email_scope_type_id = 3 and ${bouncedConditionals}) as global_bounced_emails`
      ),
      //Spam
      Database.raw(
        `count(sendgrid_events.email) filter (where bulk_email_scope_type_id = 1 and ${spamConditionals}) as marketing_spam_emails`
      ),
      Database.raw(
        `count(sendgrid_events.email) filter (where bulk_email_scope_type_id = 2 and ${spamConditionals}) as recruiting_spam_emails`
      ),
      Database.raw(
        `count(sendgrid_events.email) filter (where bulk_email_scope_type_id = 3 and ${spamConditionals}) as global_spam_emails`
      ),
    ]).from('email_histories as eh');

    query.joinRaw(
      `left join (
          select * from (select eh.id, fortpac_events.email, fortpac_events.type as event from email_histories eh, jsonb_to_recordset(eh.emails_blocked || eh.emails_invalid) as fortpac_events(email text, type text)
          union all
          select eh.id, beswe.email, beswe.event from email_histories eh inner join bulk_email_sendgrid_webhook_events beswe on beswe.sendgrid_id = eh.sendgrid_id
        ) as sendgrid_events
      ) as sendgrid_events on sendgrid_events.id = eh.id`
    );

    query.joinRaw(
      `left join (select DISTINCT coach_id, recruiter_id from recruiter_has_industries) as dig on dig.recruiter_id = eh.created_by`
    );

    query.whereNotNull('eh.bulk_email_scope_type_id');

    this.applyQueryWhereClauseDate(startDate, endDate, query, 'eh');

    query.groupByRaw('eh.created_by, CASE WHEN dig.coach_id is null THEN eh.created_by ELSE dig.coach_id END, eh.id');

    return query;
  }

  /**
   * @mainmethod totalBulkStats
   *
   * @summary Returns the total of bulk stats, meaning the ratio of how many were open, bounced, delivered & spam
   */
  formatTotalBulkStats(totalBulksStats) {
    const totalDeliveredMarketing = sumBy(totalBulksStats, (val) => Number(val.marketing_delivered_emails));
    const totalDeliveredRecruiting = sumBy(totalBulksStats, (val) => Number(val.recruiting_delivered_emails));
    const totalDeliveredGlobal = sumBy(totalBulksStats, (val) => Number(val.global_delivered_emails));

    const totalOpenMarketing = sumBy(totalBulksStats, (val) => Number(val.marketing_open_emails));
    const totalOpenRecruiting = sumBy(totalBulksStats, (val) => Number(val.recruiting_open_emails));
    const totalOpenGlobal = sumBy(totalBulksStats, (val) => Number(val.global_open_emails));

    const totalBouncedMarketing = sumBy(totalBulksStats, (val) => Number(val.marketing_bounced_emails));
    const totalBouncedRecruiting = sumBy(totalBulksStats, (val) => Number(val.recruiting_bounced_emails));
    const totalBouncedGlobal = sumBy(totalBulksStats, (val) => Number(val.global_bounced_emails));

    const totalSpamMarketing = sumBy(totalBulksStats, (val) => Number(val.marketing_spam_emails));
    const totalSpamRecruiting = sumBy(totalBulksStats, (val) => Number(val.recruiting_spam_emails));
    const totalSpamGlobal = sumBy(totalBulksStats, (val) => Number(val.global_spam_emails));

    const marketingOpenRatio = (totalOpenMarketing / totalDeliveredMarketing) * 100;
    const recruitingOpenRatio = (totalOpenRecruiting / totalDeliveredRecruiting) * 100;
    const globalOpenRatio = (totalOpenGlobal / totalDeliveredGlobal) * 100;

    const totalDelivered = totalDeliveredMarketing + totalDeliveredRecruiting + totalDeliveredGlobal;
    const totalBounced = totalBouncedMarketing + totalBouncedRecruiting + totalBouncedGlobal;
    const totalSpam = totalSpamMarketing + totalSpamRecruiting + totalSpamGlobal;
    const originalMeanRecipients = totalDelivered + totalBounced;

    const totalDeliveredRatio = (totalDelivered / originalMeanRecipients) * 100;
    const totalBouncedRatio = (totalBounced / originalMeanRecipients) * 100;
    const totalSpamdRatio = (totalSpam / originalMeanRecipients) * 100;

    const falsyToZero = (value) => (value ? value : 0);

    return [
      {
        title: 'Marketing Open Ratio',
        total: falsyToZero(marketingOpenRatio),
        icon: '',
        format: 'percent',
      },
      {
        title: 'Recruting Open Ratio',
        total: falsyToZero(recruitingOpenRatio),
        icon: '',
        format: 'percent',
      },
      {
        title: 'General Open Ratio',
        total: falsyToZero(globalOpenRatio),
        icon: '',
        format: 'percent',
      },

      {
        title: 'Total Delivered Ratio',
        total: falsyToZero(totalDeliveredRatio),
        icon: 'sentBulk',
        format: 'percent',
      },
      {
        title: 'Total Spam Ratio',
        total: falsyToZero(totalSpamdRatio),
        icon: 'spamBulk',
        format: 'percent',
      },
      {
        title: 'Total Bounced Ratio',
        total: falsyToZero(totalBouncedRatio),
        icon: 'bouncedBulk',
        format: 'percent',
      },
    ];
  }

  /**
   * @mainmethod trendBulkSent
   *
   * @summary Returns the trend of bulk sents, meaning the graph over time
   */
  async trendBulkSent(userFilters, dateRange, offset, granularity = granularityTimes.Automatic) {
    try {
      const [startDate, endDate] = dateRange;
      granularity = this.getGranularity(granularity, startDate, endDate);

      const totalBulk = await this.getTrendBulkSent(userFilters, granularity, startDate, endDate);

      const groupSerie = groupBy(totalBulk, 'serie_time');
      const { series, colors } = this.formatLabelsLineGraphBulks();
      const result = this.formatLineGraphBulk(groupSerie, granularity, offset);

      return {
        code: 200,
        data: {
          series,
          colors,
          granularity,
          data: result,
        },
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      return {
        code: 500,
        message: Antl.formatMessage('messages.error.internalServer', {
          action: 'getting',
          entity: 'bulk dashboard info',
        }),
      };
    }
  }

  /**
   * @mainmethod trendBulkSent
   *
   * @summary Returns the trend of bulk sents, meaning the graph over time
   */
  async getTrendBulkSent(userFilters, granularity, startDate, endDate) {
    const query = Database.from('email_histories as eh');
    const validRecruiters = this.getUsersWithValidCoaches();

    this.countsLineGraphBulk(query, 'eh', granularity);

    query.innerJoin('bulk_email_scope_types as scopes', 'eh.bulk_email_scope_type_id', 'scopes.id');
    query.whereIn('eh.created_by', validRecruiters);
    query.groupBy('time_format');

    await this.applyQueryWhereClauseDate(startDate, endDate, query, 'eh');
    await this.applyWhereClauseUser(userFilters, query, 'eh', 'created_by', false, true);

    return await this.applySeriesWithBulk(query, granularity, startDate, endDate);
  }

  /**
   * @mainmethod trendBulkSent
   *
   * @summary Returns the trend of bulk sents, meaning the graph over time
   */
  getUsersWithValidCoaches() {
    const coaches = Database.from('users')
      .select('users.id')
      .innerJoin('user_has_roles as ur', ' users.id', 'ur.user_id')
      .where('ur.role_id', userRoles.Coach);

    const recruiters = Database.from('recruiter_has_industries').select('recruiter_id').whereIn('coach_id', coaches);

    return Database.select('id')
      .distinct()
      .from(Database.union(coaches, true).union(recruiters, true).as('recruiters'));
  }

  /**
   * @mainmethod trendBulkSent
   *
   * @summary Returns the trend of bulk sents, meaning the graph over time
   */
  countsLineGraphBulk(query, tableName, granularity) {
    query.select([
      Database.raw(`date_trunc('${granularity[1]}', ${tableName}.send_date) as time_format`),
      Database.raw(
        `COUNT(DISTINCT(${tableName}.id)) filter (where ${tableName}.bulk_email_scope_type_id = ${Marketing}) as "marketing"`
      ),
      Database.raw(
        `COUNT(DISTINCT(${tableName}.id)) filter (where ${tableName}.bulk_email_scope_type_id = ${Recruiting}) as "recruiting"`
      ),
      Database.raw(
        `COUNT(DISTINCT(${tableName}.id)) filter (where ${tableName}.bulk_email_scope_type_id = ${Global}) as "global"`
      ),
    ]);
  }

  /**
   * @mainmethod trendBulkSent
   *
   * @summary Returns the trend of bulk sents, meaning the graph over time
   */
  getGranularity(granularity, startDate, endDate) {
    switch (granularity) {
      case granularityTimes.OneHour:
        return [1, 'hour'];
        break;
      case granularityTimes.SixHour:
        return [6, 'hour'];
        break;
      case granularityTimes.TwelveHour:
        return [12, 'hour'];
        break;
      case granularityTimes.Week:
        return [1, 'week'];
        break;
      case granularityTimes.Day:
        return [1, 'day'];
        break;
      case granularityTimes.Month:
        return [1, 'month'];
        break;
      case granularityTimes.Automatic:
        return this.automaticTimeGranularity(startDate, endDate);
        break;
    }
  }

  /**
   * @mainmethod trendBulkSent
   *
   * @summary Returns the trend of bulk sents, meaning the graph over time
   */
  formatLabelsLineGraphBulks() {
    const labels = [
      { label: 'Time', type: 'date' },
      { label: 'Marketing', type: 'number' },
      { label: 'Recruiting', type: 'number' },
      { label: 'Global', type: 'number' },
    ];
    return {
      series: labels,
      colors: labels.map((val, key) => colorsFromEpic[key]),
    };
  }

  /**
   * @mainmethod trendBulkSent
   *
   * @summary Returns the trend of bulk sents, meaning the graph over time
   */
  formatLineGraphBulk(data, granularity, offset) {
    offset *= -1;
    return values(data).map((objs) => [
      granularity[1] != 'hour'
        ? moment.utc(objs[0].serie_time).utcOffset(offset, false).format(DateFormats.SystemDefault)
        : objs[0].serie_time,
      sumBy(objs, (val) => Number(val.marketing)),
      sumBy(objs, (val) => Number(val.recruiting)),
      sumBy(objs, (val) => Number(val.global)),
    ]);
  }

  /**
   * @mainmethod tableBulkSent
   *
   * @summary Returns the table of bulk sents, this contains how many bulks were sent per coach team/ recruiter in team
   */
  async tableBulkSent(userFilters, dateRange) {
    try {
      const [startDate, endDate] = dateRange;
      const tableBulkSents = await this.getTableBulkSent(userFilters, startDate, endDate);

      const data = keyBy(tableBulkSents, 'id');
      const [rows, columns] = this.formatTableBulkSent(data, userFilters.coachId, userFilters.allRecruiters);
      return {
        code: 200,
        data: {
          columns,
          rows,
        },
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      return {
        code: 500,
        message: Antl.formatMessage('messages.error.internalServer', {
          action: 'getting',
          entity: 'bulk dashboard info',
        }),
      };
    }
  }

  /**
   * @mainmethod tableBulkSent
   *
   * @summary Returns the table of bulk sents, this contains how many bulks were sent per coach team/ recruiter in team
   */
  async getTableBulkSent(userFilters, startDate, endDate) {
    const tableBulkSentQuery = this.getTableBulkSentQuery(startDate, endDate);

    const selectAggregate = [
      Database.raw(`SUM(sq.marketing) as marketing`),
      Database.raw(`SUM(sq.recruiting) as recruiting`),
      Database.raw(`SUM(sq.global) as global`),
      Database.raw(`SUM(sq.marketing_delivered_emails) as marketing_delivered_emails`),
      Database.raw(`SUM(sq.recruiting_delivered_emails) as recruiting_delivered_emails`),
      Database.raw(`SUM(sq.global_delivered_emails) as global_delivered_emails`),
      Database.raw(`SUM(sq.delivered_emails) as delivered_emails`),
    ];

    const uniqueUserRoleQuery = this.getUniqueUserRoleQuery();

    const query = Database.from('v_users as usr')
      .select([
        ...selectAggregate,
        'usr.id',
        'usr.user_name as full_name',
        Database.raw(`CASE WHEN usr.coach_name is null THEN usr.user_name ELSE usr.coach_name END as coach_full_name`),
      ])
      .joinRaw(uniqueUserRoleQuery)
      .joinRaw(
        `
          inner join (${tableBulkSentQuery})
          sq on usr.id = sq.${userFilters.coachId || userFilters.allRecruiters ? 'created_by' : 'coach_id'}
      `
      );
    await this.applyWhereClauseUser(userFilters, query, 'usr', 'id', false);
    this.applyGroupTableUsersClause(query, userFilters.coachId, userFilters.allRecruiters);

    if (userFilters.allRecruiters) {
      query.joinRaw('inner join user_has_roles uhr on uhr.user_id = sq.coach_id and uhr.role_id = :coachId', {
        coachId: userRoles.Coach,
      });
    }

    return await query;
  }

  /**
   * @mainmethod tableBulkSent
   *
   * @summary Returns the table of bulk sents, this contains how many bulks were sent per coach team/ recruiter in team
   */
  getTableBulkSentQuery(startDate, endDate) {
    const [deliveredConditionals] = this.getBulkEventConditionals();

    const query = Database.from('email_histories as eh').select([
      'eh.created_by',
      Database.raw(`CASE WHEN dig.coach_id is null THEN eh.created_by ELSE dig.coach_id END as coach_id`),
      Database.raw(`COUNT(DISTINCT(eh.id)) filter (where eh.bulk_email_scope_type_id = ${Marketing}) as marketing`),
      Database.raw(`COUNT(DISTINCT(eh.id)) filter (where eh.bulk_email_scope_type_id = ${Recruiting}) as recruiting`),
      Database.raw(`COUNT(DISTINCT(eh.id)) filter (where eh.bulk_email_scope_type_id = ${Global}) as global`),
      Database.raw(
        `COUNT(sendgrid_events.email) filter (where ${deliveredConditionals} and eh.bulk_email_scope_type_id = ${Marketing}) as marketing_delivered_emails`
      ),
      Database.raw(
        `COUNT(sendgrid_events.email) filter (where ${deliveredConditionals} and eh.bulk_email_scope_type_id = ${Recruiting}) as recruiting_delivered_emails`
      ),
      Database.raw(
        `COUNT(sendgrid_events.email) filter (where ${deliveredConditionals} and eh.bulk_email_scope_type_id = ${Global}) as global_delivered_emails`
      ),
      Database.raw(`COUNT(sendgrid_events.email) filter (where ${deliveredConditionals}) as delivered_emails`),
    ]);

    query.joinRaw(
      `left join (
          select * from (select eh.id, fortpac_events.email, fortpac_events.type as event from email_histories eh, jsonb_to_recordset(eh.emails_blocked || eh.emails_invalid) as fortpac_events(email text, type text)
          union all
          select eh.id, beswe.email, beswe.event from email_histories eh inner join bulk_email_sendgrid_webhook_events beswe on beswe.sendgrid_id = eh.sendgrid_id
        ) as sendgrid_events
      ) as sendgrid_events on sendgrid_events.id = eh.id`
    );

    query.joinRaw(
      `left join (select DISTINCT coach_id, recruiter_id from recruiter_has_industries) as dig on dig.recruiter_id = eh.created_by`
    );

    query.whereIn('bulk_email_scope_type_id', [Marketing, Recruiting, Global]);
    this.applyQueryWhereClauseDate(startDate, endDate, query, 'eh');

    query.groupByRaw('eh.created_by, CASE WHEN dig.coach_id is null THEN eh.created_by ELSE dig.coach_id END');

    return query;
  }

  /**
   * @mainmethod tableBulkSent
   *
   * @summary Returns the table of bulk sents, this contains how many bulks were sent per coach team/ recruiter in team
   */
  formatTableBulkSent(data, coachId, allRecruiters = false) {
    const columns = [
      { label: 'id', name: 'id', options: { display: 'excluded' } },
      { label: coachId || allRecruiters ? 'Recruiter' : 'Coach', name: 'full_name', options: { display: true } },
      { label: 'Marketing', name: 'marketing', options: { display: true } },
      { label: 'Recruiting', name: 'recruiting', options: { display: true } },
      { label: 'Global', name: 'global', options: { display: true } },
      { label: 'Marketing reached', name: 'marketing_reached', options: { display: true } },
      { label: 'Recruiting reached', name: 'recruiting_reached', options: { display: true } },
      { label: 'Global reached', name: 'global_reached', options: { display: true } },
      { label: 'People reached', name: 'people_reached', options: { display: true } },
    ];
    if (allRecruiters) columns.unshift({ label: 'Coach', name: 'coach_full_name', options: { display: true } });

    const rows = Object.keys(data).map((key) => {
      const val = data[key];
      const format = {
        id: val.id,
        full_name: val.full_name,
        marketing: val.marketing,
        recruiting: val.recruiting,
        global: val.global,
        marketing_reached: val.marketing_delivered_emails,
        recruiting_reached: val.recruiting_delivered_emails,
        global_reached: val.global_delivered_emails,
        people_reached: val.delivered_emails,
      };
      if (allRecruiters) format.coach_full_name = val.coach_full_name;
      return format;
    });

    return [rows, columns];
  }

  getUniqueUserRoleQuery() {
    const rolesIds = {
      RegionalDirector: userRoles.RegionalDirector,
      Coach: userRoles.Coach,
      Recruiter: userRoles.Recruiter,
    };

    return Database.raw(
      'left join (select distinct on (user_id) last_value(role_id) over (partition by user_id order by (case when role_id = :RegionalDirector then 2 when role_id = :Coach then 1 when role_id = :Recruiter then 3 end) asc) as role_id, user_id from user_has_roles) as ur on ur.user_id = usr.id',
      rolesIds
    );
  }

  async getUsersWithoutBulks(results, userFilters) {
    try {
      const { coachId, recruiterId, regionalId, allRecruiters } = userFilters;
      let usersId = null;
      const query = Database.table('v_users as users').select(['users.id', 'users.user_name as full_name']);
      if (recruiterId) {
        usersId = [recruiterId];
      } else if (coachId) {
        usersId = await RecruiterRepository.recruiterOnTeam(coachId);
      } else if (regionalId) {
        usersId = await RecruiterRepository.coachesByRegion(regionalId);
      } else if (allRecruiters) {
        usersId = Database.from('recruiter_has_industries').select('recruiter_id').distinct();
      }

      if (!usersId) {
        query.innerJoin('user_has_roles as urole', 'users.id', 'urole.user_id').where('urole.role_id', userRoles.Coach);
      } else {
        query.whereIn('users.id', usersId);
      }

      const usersData = await query.orderBy('users.user_name');
      const resultsWithoutBulks = {
        columns: results.columns.filter((column) => column.name === 'full_name' || column.name === 'id'),
        rows: differenceBy(usersData, results.rows, 'id'),
      };
      return {
        code: 200,
        data: resultsWithoutBulks,
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      return {
        code: 500,
        message: Antl.formatMessage('messages.error.internalServer', {
          action: 'getting',
          entity: 'bulk dashboard info',
        }),
      };
    }
  }

  applyGroupTableUsersClause(query, coachId, allRecruiters = false) {
    if (!coachId && !allRecruiters) {
      query.where('ur.role_id', userRoles.Coach);
    }
    query.groupByRaw('usr.id, usr.user_name, usr.coach_name').orderBy('usr.user_name');
  }

  applyGroupUsersClause(query, coachId) {
    if (!coachId) {
      query.where('ur.role_id', userRoles.Coach);
    }
    query.groupByRaw('usr.id, usr.user_name').orderBy('usr.user_name');
  }

  async applySeriesWithBulk(query, granularity, startDate, endDate) {
    const granularities = granularity.join(' ');
    const queryWithSeries = Database.with(
      'series',
      Database.raw(`select date_trunc('${granularity[1]}',serie) as serie_time from generate_series('${startDate}'::timestamp at time zone 'utc','${endDate}'::timestamp at time zone 'utc','${granularities}'::interval) serie), 
      bulk_counts as (${query}`)
    )
      .select(['table_one.*'])
      .from(
        Database.raw(`
            (select series.serie_time,
              coalesce(sum(bulk_counts.marketing), 0) as marketing,
              coalesce(sum(bulk_counts.recruiting), 0) as recruiting,
              coalesce(sum(bulk_counts.global), 0) as global
              from series
              left outer join bulk_counts on bulk_counts.time_format >= series.serie_time and  bulk_counts.time_format <  series.serie_time + '${granularities}'
              group by series.serie_time order by series.serie_time asc
            ) as table_one
      `)
      );

    return await queryWithSeries;
  }

  automaticTimeGranularity(startDate, endDate) {
    const momentStartDate = moment(startDate);
    const momentEndDate = moment(endDate);
    const days = momentEndDate.diff(momentStartDate, 'days') + 1;
    if (days <= 1) {
      return [1, 'hour'];
    } else if (days <= 2) {
      return [6, 'hour'];
    } else if (days <= 3) {
      return [12, 'hour'];
    } else if (days <= 30) {
      return [1, 'day'];
    } else if (days <= 90) {
      return [1, 'week'];
    } else {
      return [1, 'month'];
    }
  }

  async applyQueryWhereClauseDate(startDate, endDate, query, tableName) {
    if (startDate && endDate) {
      query.whereBetween(`${tableName}.send_date`, [startDate, endDate]);
    } else if (startDate) {
      query.where(`${tableName}.send_date`, '>=', startDate);
    } else if (endDate) {
      query.where(`${tableName}.send_date`, '<=', endDate);
    }
  }

  async applyWhereClauseUser(userFilters, query, tableName, tableRelation, isAssigned, isATrendGraph = false) {
    const { coachId, recruiterId, regionalId } = userFilters;
    const userId = coachId || regionalId || null;
    if (!recruiterId && !userId) {
      return null;
    }
    if (userId && !recruiterId) {
      const isACoachFIlter = coachId;
      const whereInClauseUsers = isACoachFIlter
        ? await RecruiterRepository.recruiterOnTeam(coachId)
        : isATrendGraph
        ? await this.getWhereInClauseArrayByRegional(regionalId)
        : await RecruiterRepository.coachesByRegion(regionalId);
      query.whereRaw(
        `(${tableName}.${tableRelation} in (${whereInClauseUsers}) ${
          isAssigned ? `${isACoachFIlter ? 'and' : 'or'}  ${tableName}.recruiter_id in (${whereInClauseUsers})` : ''
        })`
      );
    } else if ((recruiterId && userId && !isAssigned) || (recruiterId && !userId && !isAssigned)) {
      query.where(`${tableName}.${tableRelation}`, recruiterId);
    } else if ((recruiterId && !userId && isAssigned) || (recruiterId && userId && isAssigned)) {
      query.where(`${tableName}.recruiter_id`, recruiterId);
    }
  }

  async getWhereInClauseArrayByRegional(regionalId) {
    const coachesIds = await RecruiterRepository.coachesByRegion(Number(regionalId));
    const recruitersIds = (await RecruiterRepository.recruitersByUsers(coachesIds, 'coach_id')).map(
      (row) => row.recruiter_id
    );
    const ids = uniq([...coachesIds, ...recruitersIds]);
    return ids;
  }

  getDates(startDate, endDate, offset) {
    offset *= -1;
    startDate = moment.utc(startDate).utcOffset(offset, false).format(DateFormats.SystemDefault);
    if (
      !endDate ||
      moment.utc(endDate, DateFormats.SystemDefault).utcOffset(offset, false).format(DateFormats.SystemDefault) >
        moment.utc().format(DateFormats.SystemDefault)
    ) {
      endDate = moment.utc().format(DateFormats.SystemDefault);
    } else {
      endDate = moment.utc(endDate).utcOffset(offset, false).format(DateFormats.SystemDefault);
    }
    return [startDate, endDate];
  }

  /**
   * Returns the data formated for the spreadsheet library
   *
   * @description The rawData must contain two objects, the column & the rows
   *
   * @param {Object} rawData - The object containing the columns & rows
   *
   * @return {Object[]} ssDataArray
   */
  convertTableDataToCSV(rawData) {
    const filteredColumns = rawData.columns.filter(({ options }) => options.display === true);
    const formatedColumns = filteredColumns.map(({ label }) => label);
    const columnLabels = filteredColumns.map(({ name }) => name);

    const rows = rawData.rows.map((row) => columnLabels.map((label) => row[label]));
    const spreadSheet = [formatedColumns, ...rows];

    return spreadSheet;
  }
}

module.exports = BulkEmailDashboardRepository;
