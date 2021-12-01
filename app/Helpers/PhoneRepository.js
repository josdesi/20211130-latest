'use strict';

const Env = use('Env');

const moment = use('moment');
const appInsights = require('applicationinsights');
const Antl = use('Antl');
const Ws = use('Socket.IO');
const parsePhoneNumber = require('libphonenumber-js');

const Database = use('Database');
const DatabaseAnalytics = Database.connection(Env.get('DB_ANALYTICS_CONNECTION'));

const { concat, chunk, differenceBy, groupBy, keyBy, merge, orderBy, sumBy, values } = use('lodash');

const {
  activityLogTypes,
  colorsChartsPhoneDashboard, 
  dataRCTypes, 
  DateFormats, 
  granularityTimes, 
  IanaTimezones,
  nameTypes, 
  RCLogStatuses, 
  userRoles, 
  userStatus,
  WebSocketNamespaces,
} = use('App/Helpers/Globals');

// Repositories
const RecruiterRepository = new (use('App/Helpers/RecruiterRepository'))();
const CompanyRepository = new (use('App/Helpers/CompanyRepository'))();
const CandidateRepository = new (use('App/Helpers/CandidateRepository'))();
const NameRepository = new (use('App/Helpers/NameRepository'))();
const HiringAuthorityRepository = new (use('App/Helpers/HiringAuthorityRepository'))();
const GenericSendgridTemplateEmail = new (use('App/Emails/GenericSendgridTemplateEmail'))();
const ModulePresetsConfigRepository = new (use('App/Helpers/ModulePresetsConfigRepository'))();

const secondsInHour = 3600;
const secondsInMin = 60;

class PhoneRepository {
  //Total Calls Data Graph
  async graphTotalCallsData(userFilters, dateRange) {
    try {
      const [startDate, endDate] = dateRange;
      const inboundCallsByUser = this.totalCallListByType(
        userFilters,
        startDate,
        endDate,
        dataRCTypes.InboundCall
      );
      const outboundCallsByUser = this.totalCallListByType(
        userFilters,
        startDate,
        endDate,
        dataRCTypes.OutboundCall
      );
      const missedCallsByUser = this.totalCallListByType(
        userFilters,
        startDate,
        endDate,
        dataRCTypes.MissedCall
      );
      const avgTimeCallsByUser = this.totalCallListByType(
        userFilters,
        startDate,
        endDate,
        dataRCTypes.AvgHandleTimeCall
      );
      const timeCallsByUser = this.totalCallListByType(
        userFilters,
        startDate,
        endDate,
        dataRCTypes.TotalTimeCall
      );
      const [
        totalListInboundCalls,
        totalListOutboundCalls,
        totalListMissedCalls,
        totalListAvgTimeCalls,
        totalTimeCallsByUser
      ] = await Promise.all([
        inboundCallsByUser,
        outboundCallsByUser,
        missedCallsByUser,
        avgTimeCallsByUser,
        timeCallsByUser
      ]);

      const data = this.formatCountTotalCallsInventory(
        totalListInboundCalls,
        totalListOutboundCalls,
        totalListMissedCalls,
        totalListAvgTimeCalls,
        totalTimeCallsByUser
      );

      return {
        code: 200,
        data,
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      return {
        success: false,
        code: 500,
        message: Antl.formatMessage('messages.error.internalServer', { action: 'retrieving', entity: 'Call data' })
      };
    }
  }

  async totalCallListByType(userFilters, startDate, endDate, RcTypeInfo){
    const query = DatabaseAnalytics.table('rc_calls_records as calls_records')
      .select([
                this.applyOperationRaw(RcTypeInfo),
                userFilters.coachId || userFilters.recruiterId
                  ? 'calls_records.user_id as id'
                  : 'calls_records.coach_id as id',
                userFilters.coachId || userFilters.recruiterId
                  ? 'calls_records.user_full_name as full_name'
                  : 'calls_records.coach_full_name as full_name'
              ])
      .whereNot('calls_records.direction', dataRCTypes.InternalCall.filterValue)
      .whereIn(`calls_records.${RcTypeInfo.filterName}`, RcTypeInfo.filterValue)
      .whereNotNull('calls_records.coach_id');

    this.applyWhereClauseDate(startDate, endDate, query, 'calls_records', 'start_time');
    this.applyWhereClause(userFilters, query, 'calls_records');
    if(userFilters.coachId || userFilters.recruiterId){
      query.groupByRaw('calls_records.user_id, calls_records.user_full_name');
      query.orderBy('calls_records.user_full_name', 'asc');
    }
    else{
      query.groupByRaw('calls_records.coach_id, calls_records.coach_full_name');
      query.orderBy('calls_records.coach_full_name', 'asc');
    }

    return await query;
  }

  applyOperationRaw(RcTypeInfo){
    if(RcTypeInfo.operation === 'Average'){
      return DatabaseAnalytics.raw(`COUNT(*) as total_calls, SUM(duration) as total_time, AVG(duration) as ${RcTypeInfo.propertyName}`);
    } else if (RcTypeInfo.operation === 'Sum'){
      return DatabaseAnalytics.raw(`SUM(duration) as ${RcTypeInfo.propertyName}`);
    } else{
      return DatabaseAnalytics.raw(`COUNT(distinct(calls_records.id)) as ${RcTypeInfo.propertyName}`);
    }
  }

  formatCountTotalCallsInventory(totalListInboundCalls, totalListOutboundCalls, totalListMissedCalls, totalListAvgTimeCalls, totalListTimeCallsByUser) {
    const totalInboundCalls = sumBy(totalListInboundCalls, (val) => Number(val[dataRCTypes.InboundCall.propertyName]));
    const totalOutboundCalls = sumBy(totalListOutboundCalls, (val) => Number(val[dataRCTypes.OutboundCall.propertyName]));
    const totalMissedCalls = sumBy(totalListMissedCalls, (val) => Number(val[dataRCTypes.MissedCall.propertyName]));
    const totalCalls = sumBy(totalListAvgTimeCalls, (val) => Number(val['total_calls']));
    const totalAvgTimeCalls = this.convertSecToMin(sumBy(totalListAvgTimeCalls, (val) => Number(val['total_time'])) / totalCalls) || '0 min';
    const totalTimeInSeconds = sumBy(totalListTimeCallsByUser, (val) => Number(val[dataRCTypes.TotalTimeCall.propertyName]));
    const totalTimeCalls = this.convertSecToHrMin(totalTimeInSeconds) || '0 min';
    return [
      {
        title: 'Total Call Time',
        total: totalTimeCalls,
        icon: 'totalTime',
        format: 'none'
      },
      {
        title: 'Avg. Handle Time',
        total: totalAvgTimeCalls,
        icon: 'avgHandleTimeCall',
        format: 'none'
      },
      {
        title: 'Total Calls',
        total: totalInboundCalls + totalOutboundCalls,
        icon: 'totalCalls',
      },
      {
        title: 'Outbound',
        total: totalOutboundCalls,
        icon: 'outboundCall',
      },
      {
        title: 'Inbound',
        total: totalInboundCalls,
        icon: 'inboundCall',
      },
      {
        title: 'Missed',
        total: totalMissedCalls,
        icon: 'missedCall',
      },
    ];
  }

  convertSecToMin(seconds){
    if(!seconds) seconds = 0;

    const totalSec = Math.floor(seconds);
    if(totalSec < secondsInMin){
      return `${totalSec} sec`;
    } else {
      const secondsResidue = totalSec % secondsInMin;
      const totalMin = `${Math.floor(totalSec / secondsInMin)} min`;
      return secondsResidue !== 0 ? `${totalMin}, ${secondsResidue} sec` : `${totalMin}`;
    }
  }

  convertSecToHrMin(seconds){
    if(!seconds) seconds = 0;

    if(seconds < secondsInHour){
      const totalMin = Math.floor(seconds / secondsInMin);
      return `${totalMin} min`;
    } else {
      const totalMin = Math.floor(seconds / secondsInMin);
      const minutesResidue = totalMin % secondsInMin;
      const totalHr = `${Math.floor(totalMin / secondsInMin)} hrs`;
      return minutesResidue !== 0 ? `${totalHr}, ${minutesResidue} min` : `${totalHr}`;
    }
  }

  //Total List Call Inventory
  async listCallsInventory(userFilters, dateRange) {
    try {
      const [startDate, endDate, daysDifference = 1] = dateRange;
      const totalInboundCalls = this.totalCallListByType(
        userFilters,
        startDate,
        endDate,
        dataRCTypes.InboundCall
      );
      const totalOutboundCalls = this.totalCallListByType(
        userFilters,
        startDate,
        endDate,
        dataRCTypes.OutboundCall
      );
      const totalMissedCalls = this.totalCallListByType(
        userFilters,
        startDate,
        endDate,
        dataRCTypes.MissedCall
      );
      const totalAvgTimeCalls = this.totalCallListByType(
        userFilters,
        startDate,
        endDate,
        dataRCTypes.AvgHandleTimeCall
      );
      const totalVoicemailCalls = this.totalCallListByType(
        userFilters,
        startDate,
        endDate,
        dataRCTypes.VoicemailCall
      );
      const totalTimeCalls = this.totalCallListByType(
        userFilters,
        startDate,
        endDate,
        dataRCTypes.TotalTimeCall
      );
      const [
        totalInCalls,
        totalOutCalls,
        totalMissed,
        totalAvgTime,
        totalVmCalls,
        totalDurationCalls
      ] = await Promise.all([
        totalInboundCalls,
        totalOutboundCalls,
        totalMissedCalls,
        totalAvgTimeCalls,
        totalVoicemailCalls,
        totalTimeCalls
      ]);

      const data = orderBy(
        merge(
          keyBy(totalInCalls, 'id'),
          keyBy(totalOutCalls, 'id'),
          keyBy(totalMissed, 'id'),
          keyBy(totalAvgTime, 'id'),
          keyBy(totalVmCalls, 'id'),
          keyBy(totalDurationCalls, 'id'),
        ),
        ['full_name'],
        ['asc']
      );

      const [rows, columns] = this.formatListCallsInventory(data, userFilters.coachId, daysDifference);
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
        success: false,
        code: 500,
        message: Antl.formatMessage('messages.error.internalServer', { action: 'retrieving', entity: 'List Call data' })
      };
    }
  }

  formatListCallsInventory(data, coachId, daysDifference) {
    const columns = [
      { label: 'id', name: 'id', options: { display: 'excluded' } },
      { label: coachId ? 'Recruiter' : 'Coach', name: 'full_name', options: { display: true } },
      { label: 'Total Calls', name: 'total', options: { display: true } },
      { label: 'Total Call Time', name: 'total_time', options: { display: true } },
      { label: 'Avg. Calls/Day', name: 'avg_call_day', options: { display: true } },
      { label: 'Inbound', name: 'inbound', options: { display: true } },
      { label: 'Outbound', name: 'outbound', options: { display: true } },
      { label: 'Missed', name: 'missed', options: { display: true } },
      { label: 'Voicemail', name: 'voicemail', options: { display: true } },
      { label: 'Avg. Handle Time', name: 'avg_time', options: { display: true } },
    ];
    const rows = Object.keys(data).map((key) => {
      const val = data[key];
      const totalInCalls = Number(val[dataRCTypes.InboundCall.propertyName]) || 0;
      const totalOutCalls = Number(val[dataRCTypes.OutboundCall.propertyName]) || 0;
      const totalMissedCalls = Number(val[dataRCTypes.MissedCall.propertyName]) || 0;
      const totalVmCalls = Number(val[dataRCTypes.VoicemailCall.propertyName]) || 0;
      const totalAvgTimeCalls = this.convertSecToMin(val[dataRCTypes.AvgHandleTimeCall.propertyName]) || '0 min';
      const totalAvgCallsDay = Math.floor(Number(totalInCalls + totalOutCalls) / (daysDifference === 0 ? 1 : daysDifference));
      const totalTimeCalls = this.convertSecToHrMin(val[dataRCTypes.TotalTimeCall.propertyName]) ||
      '0 min';
      return {
        id: val.id,
        avg_call_day: totalAvgCallsDay,
        avg_time: totalAvgTimeCalls,
        full_name: val.full_name,
        inbound: totalInCalls,
        missed: totalMissedCalls,
        outbound: totalOutCalls,
        total: totalInCalls + totalOutCalls,
        voicemail: totalVmCalls,
        total_time: totalTimeCalls
      };
    });
    return [rows, columns];
  }

  //Total List Call Inventory By Recruiter
  async listCallsInventoryByRecruiter(userFilters, dateRange) {
    try {
      const [startDate, endDate, daysDifference] = dateRange;
      const inboundCallsByRecruiter = this.totalCallListByType(
        userFilters,
        startDate,
        endDate,
        dataRCTypes.InboundCall
      );
      const outboundCallsByRecruiter = this.totalCallListByType(
        userFilters,
        startDate,
        endDate,
        dataRCTypes.OutboundCall
      );
      const missedCallsByRecruiter = this.totalCallListByType(
        userFilters,
        startDate,
        endDate,
        dataRCTypes.MissedCall
      );
      const voicemailCallsByRecruiter = this.totalCallListByType(
        userFilters,
        startDate,
        endDate,
        dataRCTypes.VoicemailCall
      );
      const rejectedCallsByRecruiter = this.totalCallListByType(
        userFilters,
        startDate,
        endDate,
        dataRCTypes.RejectedCall
      );
      const [
        totalListInboundCalls,
        totalListOutboundCalls,
        totalListMissedCalls,
        totalListVoicemailCalls,
        totalListRejectedCalls
      ] = await Promise.all([
        inboundCallsByRecruiter,
        outboundCallsByRecruiter,
        missedCallsByRecruiter,
        voicemailCallsByRecruiter,
        rejectedCallsByRecruiter
      ]);

      const data = this.formatCountTotalCallsInventoryByRecruiter(
        totalListInboundCalls,
        totalListOutboundCalls,
        totalListMissedCalls,
        totalListVoicemailCalls,
        totalListRejectedCalls,
        daysDifference
      );

      return {
        code: 200,
        data,
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      return {
        success: false,
        code: 500,
        message: Antl.formatMessage('messages.error.internalServer', { action: 'retrieving', entity: 'Call data by recruiter' })
      };
    }
  }

  formatCountTotalCallsInventoryByRecruiter(totalListInboundCalls, totalListOutboundCalls, totalListMissedCalls, totalListVoicemailCalls, totalListRejectedCalls, daysDifference) {
    const totalInboundCalls = sumBy(totalListInboundCalls, (val) => Number(val[dataRCTypes.InboundCall.propertyName]));
    const totalOutboundCalls = sumBy(totalListOutboundCalls, (val) => Number(val[dataRCTypes.OutboundCall.propertyName]));
    const totalMissedCalls = sumBy(totalListMissedCalls, (val) => Number(val[dataRCTypes.MissedCall.propertyName]));
    const totalVoicemailCalls = sumBy(totalListVoicemailCalls, (val) => Number(val[dataRCTypes.VoicemailCall.propertyName]));
    const totalRejectedCalls = sumBy(totalListRejectedCalls, (val) => Number(val[dataRCTypes.RejectedCall.propertyName]));
    const totalAvgCallsDay = Math.floor(Number(totalInboundCalls + totalOutboundCalls) / (daysDifference === 0 ? 1 : daysDifference));
    return [
      {
        title: 'Avg. Calls/Days',
        total: totalAvgCallsDay
      },
      {
        title: '% Missed',
        total: this.calculatePercentage(totalMissedCalls, totalInboundCalls)
      },
      {
        title: 'Voicemails',
        total: totalVoicemailCalls
      },
      {
        title: 'Rejected',
        total: totalRejectedCalls
      }
    ];
  }

  calculatePercentage(partialValue, totalValue) {
    if(partialValue === 0 || totalValue === 0) return 0;
    return Math.round(((100 * partialValue) / totalValue));
  }

  //Calls Activity In Time
  async lineGraphTotalCallsActivity(
    userFilters,
    dateRange,
    offset,
    granularity = granularityTimes.Automatic
  ) {
    try {
      const [startDate, endDate] = dateRange;
      granularity = this.getGranularity(granularity, startDate, endDate);
      const totalCallsInTime = await this.totalCallsInTime(
        userFilters,
        granularity,
        startDate,
        endDate,
      );
      const groupSerie = groupBy(totalCallsInTime, 'serie_time');
      const series = this.formatLabelsLineGraphCallsActivity();
      const result = this.formatLineGraphCallsActivity(groupSerie, granularity, offset);
      return {
        code: 200,
        data: {
          series,
          granularity,
          data: result,
          colors: colorsChartsPhoneDashboard.callColors
        },
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      return {
        success: false,
        code: 500,
        message: Antl.formatMessage('messages.error.internalServer', { action: 'retrieving', entity: 'Call data in time' })
      };
    }
  }

  formatLabelsLineGraphCallsActivity() {
    return [
      { label: 'Time', type: 'date' },
      { label: 'Inbound', type: 'number' },
      { label: 'Outbound', type: 'number' },
      { label: 'Missed', type: 'number' }
    ];
  }

  formatLineGraphCallsActivity(data, granularity, offset) {
    offset *= -1;
    return values(data).map((objs) => [
      granularity[1] != 'hour'
        ? moment.utc(objs[0].serie_time).utcOffset(offset, false).format(DateFormats.SystemDefault)
        : objs[0].serie_time,
      sumBy(objs, (val) => Number(val[dataRCTypes.InboundCall.propertyName])),
      sumBy(objs, (val) => Number(val[dataRCTypes.OutboundCall.propertyName])),
      sumBy(objs, (val) => Number(val[dataRCTypes.MissedCall.propertyName]))
    ]);
  }

  async totalCallsInTime(userFilters, granularity, startDate, endDate) {
    const query = DatabaseAnalytics.from('rc_calls_records as calls_records')
        .whereNot('calls_records.direction', dataRCTypes.InternalCall.filterValue)
        .whereNotNull('calls_records.coach_id');
    this.countsLineGraphCallActivity(query, 'calls_records', granularity);
    query.groupBy('time_format');
    await this.applyWhereClauseDate(startDate, endDate, query, 'calls_records', 'start_time');
    await this.applyWhereClause(userFilters, query, 'calls_records');

    return await this.applySeriesWithCallRecords(query, granularity, startDate, endDate);
  }

  countsLineGraphCallActivity(query, tableName, granularity) {
    query.select([
      DatabaseAnalytics.raw(`date_trunc('${granularity[1]}',${tableName}.start_time) as time_format`),
      DatabaseAnalytics.raw(
        `COUNT(distinct(${tableName}.id)) filter (where ${tableName}.direction = '${dataRCTypes.InboundCall.filterValue}') as ${dataRCTypes.InboundCall.propertyName}`
      ),
      DatabaseAnalytics.raw(
        `COUNT(distinct(${tableName}.id)) filter (where ${tableName}.direction = '${dataRCTypes.OutboundCall.filterValue}') as ${dataRCTypes.OutboundCall.propertyName}`
      ),
      DatabaseAnalytics.raw(
        `COUNT(distinct(${tableName}.id)) filter (where ${tableName}.result = '${dataRCTypes.MissedCall.filterValue}') as ${dataRCTypes.MissedCall.propertyName}`
      )
    ]);
  }

  async applySeriesWithCallRecords(query, granularity, startDate, endDate) {
    const queryWithSeries = DatabaseAnalytics.with(
      'series',
      DatabaseAnalytics.raw(`SELECT date_trunc('${
        granularity[1]
      }',serie) AS serie_time FROM generate_series('${startDate}'::timestamp at time zone 'utc','${endDate}'::timestamp at time zone 'utc','${granularity.join(
        ' '
      )}'::interval) serie), activity_counts AS (${query}`)
    )
      .select(['table_one.*'])
      .from(
        DatabaseAnalytics.raw(`
            (SELECT series.serie_time,
              COALESCE(sum(activity_counts.inbound_calls), 0) AS inbound_calls,
              COALESCE(sum(activity_counts.outbound_calls), 0) AS outbound_calls,
              COALESCE(sum(activity_counts.missed_calls), 0) AS missed_calls FROM series
              LEFT OUTER JOIN activity_counts ON activity_counts.time_format >= series.serie_time AND activity_counts.time_format <  series.serie_time + '${granularity.join(
                ' '
              )}'
              GROUP BY series.serie_time ORDER BY series.serie_time ASC
            ) table_one
      `)
      );
    return await queryWithSeries;
  }

  getGranularity(granularity, startDate, endDate) {
    switch (granularity) {
      case granularityTimes.OneHour:
        return [1, 'hour'];
      case granularityTimes.SixHour:
        return [6, 'hour'];
      case granularityTimes.TwelveHour:
        return [12, 'hour'];
      case granularityTimes.Week:
        return [1, 'week'];
      case granularityTimes.Day:
        return [1, 'day'];
      case granularityTimes.Month:
        return [1, 'month'];
      case granularityTimes.Automatic:
        return this.automaticTimeGranularity(startDate, endDate);
    }
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

  //Total SMS Data Graph
  async graphTotalSMSData(userFilters, dateRange) {
    try {
      const [startDate, endDate] = dateRange;

      const sentSMSByUser = this.totalSMSListByType(
        userFilters,
        startDate,
        endDate,
        dataRCTypes.SentSMS
      );
      const receivedSMSByUser = this.totalSMSListByType(
        userFilters,
        startDate,
        endDate,
        dataRCTypes.ReceivedSMS
      );
      const [
        totalListSentSMS,
        totalListReceivedSMS,
      ] = await Promise.all([
        sentSMSByUser,
        receivedSMSByUser,
      ]);

      const data = this.formatCountTotalSMSInventory(
        totalListSentSMS,
        totalListReceivedSMS,
      );

      return {
        code: 200,
        data,
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      return {
        success: false,
        code: 500,
        message: Antl.formatMessage('messages.error.internalServer', { action: 'retrieving', entity: 'Message data' })
      };
    }
  }

  async totalSMSListByType(userFilters, startDate, endDate, RcTypeInfo){
    const query = DatabaseAnalytics.table('rc_messages_records as messages_records')
      .select([
                DatabaseAnalytics.raw(`COUNT(distinct(messages_records.id)) as ${RcTypeInfo.propertyName}`),
                userFilters.coachId || userFilters.recruiterId
                  ? 'messages_records.user_id as id'
                  : 'messages_records.coach_id as id',
                userFilters.coachId || userFilters.recruiterId
                  ? 'messages_records.user_full_name as full_name'
                  : 'messages_records.coach_full_name as full_name'
            ])
    .whereIn(`messages_records.${RcTypeInfo.filterName}`, RcTypeInfo.filterValue)
    .whereNotNull('messages_records.coach_id');

    this.applyWhereClauseDate(startDate, endDate, query, 'messages_records', 'creation_time');
    this.applyWhereClause(userFilters, query, 'messages_records');
    if(userFilters.coachId || userFilters.recruiterId){
      query.groupByRaw('messages_records.user_id, messages_records.user_full_name');
      query.orderBy('messages_records.user_full_name', 'asc');
    }
    else{
      query.groupByRaw('messages_records.coach_id, messages_records.coach_full_name');
      query.orderBy('messages_records.coach_full_name', 'asc');
    }

    return await query;
  }

  async applyWhereClause(userFilters, query, tableName) {
    const { coachId, recruiterId, regionalId } = userFilters;
    const whereClause = {};

    if (regionalId) {
      whereClause[`${tableName}.regional_id`] = regionalId;
    }
    if (coachId) {
      whereClause[`${tableName}.coach_id`] = coachId;
    }
    if (recruiterId) {
      whereClause[`${tableName}.user_id`] = recruiterId;
    }

    query.where(whereClause);
  }

  formatCountTotalSMSInventory(totalListSentSMS, totalListReceivedSMS) {
    const totalSentSMS = sumBy(totalListSentSMS, (val) => Number(val[dataRCTypes.SentSMS.propertyName]));
    const totalReceivedSMS = sumBy(totalListReceivedSMS, (val) => Number(val[dataRCTypes.ReceivedSMS.propertyName]));
    return [
      {
        title: 'Texts Sent',
        total: totalSentSMS,
        icon: 'sentSMS',
      },
      {
        title: 'Texts Received',
        total: totalReceivedSMS,
        icon: 'receivedSMS',
      },
    ];
  }

  //Total List SMS Inventory
  async listSMSInventory(userFilters, dateRange) {
    try {
      const [startDate, endDate] = dateRange;
      const totalSentSMS = this.totalSMSListByType(
        userFilters,
        startDate,
        endDate,
        dataRCTypes.SentSMS
      );
      const totalReceivedSMS = this.totalSMSListByType(
        userFilters,
        startDate,
        endDate,
        dataRCTypes.ReceivedSMS
      );

      const [
        totalSent,
        totalReceived,
      ] = await Promise.all([
        totalSentSMS,
        totalReceivedSMS,
      ]);

      const data = orderBy(
        merge(
          keyBy(totalSent, 'id'),
          keyBy(totalReceived, 'id'),
        ),
        ['full_name'],
        ['asc']
      );

      const [rows, columns] = this.formatListSMSInventory(data, userFilters.coachId);
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
        success: false,
        code: 500,
        message: Antl.formatMessage('messages.error.internalServer', { action: 'retrieving', entity: 'List Message data' })
      };
    }
  }

  formatListSMSInventory(data, coachId) {
    const columns = [
      { label: 'id', name: 'id', options: { display: 'excluded' } },
      { label: coachId ? 'Recruiter' : 'Coach', name: 'full_name', options: { display: true } },
      { label: 'Texts Sent', name: 'sent', options: { display: true } },
      { label: 'Texts Received', name: 'received', options: { display: true } },
      { label: 'Total Texts', name: 'total', options: { display: true } },
    ];
    const rows = Object.keys(data).map((key) => {
      const val = data[key];
      const totalSentSMS = Number(val[dataRCTypes.SentSMS.propertyName]) || 0;
      const totalReceivedSMS = Number(val[dataRCTypes.ReceivedSMS.propertyName]) || 0;
      return {
        id: val.id,
        full_name: val.full_name,
        sent: totalSentSMS,
        received: totalReceivedSMS,
        total: totalSentSMS + totalReceivedSMS,
      };
    });
    return [rows, columns];
  }

  //SMS Activity In Time
  async lineGraphTotalSMSActivity(
    userFilters,
    dateRange,
    offset,
    granularity = granularityTimes.Automatic
  ) {
    try {
      const [startDate, endDate] = dateRange;
      granularity = this.getGranularity(granularity, startDate, endDate);
      const totalOutboundSMSInTime = this.totalSMSInTime(
        userFilters,
        granularity,
        startDate,
        endDate,
        dataRCTypes.SentSMS
      );
      const totalInboundSMSInTime = this.totalSMSInTime(
        userFilters,
        granularity,
        startDate,
        endDate,
        dataRCTypes.InboundSMS
      );
      const [totalOutSMS, totalInSMS] = await Promise.all([totalOutboundSMSInTime, totalInboundSMSInTime]);
      const data = concat(totalOutSMS, totalInSMS);
      const groupSerie = groupBy(data, 'serie_time');
      const series = this.formatLabelsLineGraphSMSActivity();
      const result = this.formatLineGraphSMSActivity(groupSerie, granularity, offset);
      return {
        code: 200,
        data: {
          series,
          granularity,
          data: result,
          colors: colorsChartsPhoneDashboard.SMSColors
        },
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      return {
        success: false,
        code: 500,
        message: Antl.formatMessage('messages.error.internalServer', { action: 'retrieving', entity: 'Message data in time' })
      };
    }
  }

  formatLabelsLineGraphSMSActivity() {
    return [
      { label: 'Time', type: 'date' },
      { label: 'Sent', type: 'number' },
      { label: 'Received', type: 'number' }
    ];
  }

  formatLineGraphSMSActivity(data, granularity, offset) {
    offset *= -1;
    return values(data).map((objs) => [
      granularity[1] != 'hour'
        ? moment.utc(objs[0].serie_time).utcOffset(offset, false).format(DateFormats.SystemDefault)
        : objs[0].serie_time,
      sumBy(objs, (val) => val[dataRCTypes.SentSMS.propertyName] ?  Number(val[dataRCTypes.SentSMS.propertyName]) : 0),
      sumBy(objs, (val) => val[dataRCTypes.InboundSMS.propertyName] ? Number(val[dataRCTypes.InboundSMS.propertyName]) : 0)
    ]);
  }

  async totalSMSInTime(userFilters, granularity, startDate, endDate, RcTypeInfo) {
    const query = DatabaseAnalytics.from('rc_messages_records as messages_records').whereNotNull('messages_records.coach_id');
    this.countsLineGraphSMSActivity(query, granularity[1]);
    query.groupBy('time_format');
    await this.applyWhereClauseDate(startDate, endDate, query, 'messages_records', 'creation_time');
    await this.applyWhereClause(userFilters, query, 'messages_records');

    return await this.applySeriesWithSMSRecords(query, granularity, startDate, endDate, RcTypeInfo);
  }

  countsLineGraphSMSActivity(query, granularity) {
    query.select([
      DatabaseAnalytics.raw(`date_trunc('${granularity}', messages_records.creation_time) as time_format`),
      DatabaseAnalytics.raw(
        `COUNT(distinct(messages_records.id)) filter (where messages_records.direction = '${dataRCTypes.InboundSMS.filterValue}') as ${dataRCTypes.InboundSMS.propertyName}`
      ),
      DatabaseAnalytics.raw(
        `COUNT(distinct(messages_records.id)) filter (where messages_records.direction = '${dataRCTypes.SentSMS.filterValue}') as ${dataRCTypes.SentSMS.propertyName}`
      )
    ])
  }

  async applySeriesWithSMSRecords(query, granularity, startDate, endDate, RcTypeInfo) {
    const queryWithSeries = DatabaseAnalytics.with(
      'series',
      DatabaseAnalytics.raw(`SELECT date_trunc('${
        granularity[1]
      }',serie) AS serie_time FROM generate_series('${startDate}'::timestamp at time zone 'utc','${endDate}'::timestamp at time zone 'utc','${granularity.join(
        ' '
      )}'::interval) serie), activity_counts AS (${query}`)
    )
      .select(['table_one.*'])
      .from(
        DatabaseAnalytics.raw(`
            (SELECT series.serie_time,
              COALESCE(sum(activity_counts.${RcTypeInfo.propertyName}), 0) AS ${RcTypeInfo.propertyName}
              FROM series
              LEFT OUTER JOIN activity_counts ON activity_counts.time_format >= series.serie_time AND activity_counts.time_format <  series.serie_time + '${granularity.join(
                ' '
              )}'
              GROUP BY series.serie_time ORDER BY series.serie_time ASC
            ) table_one
        `)
      );
    return await queryWithSeries;
  }

  async applyWhereClauseDate(startDate, endDate, query, tableName, propertyName) {
    if (startDate && endDate) {
      query.whereBetween(`${tableName}.${propertyName}`, [startDate, endDate]);
    } else if (startDate) {
      query.where(`${tableName}.${propertyName}`, '>=', startDate);
    } else if (endDate) {
      query.where(`${tableName}.${propertyName}`, '<=', endDate);
    }
  }

  getDates(startDate, endDate, offset) {
    offset *= -1;
    startDate = moment.utc(startDate).utcOffset(offset, false).format(DateFormats.SystemDefault);
    if (
      moment.utc(endDate, DateFormats.SystemDefault).utcOffset(offset, false).format(DateFormats.SystemDefault) >
        moment.utc().format(DateFormats.SystemDefault) ||
      !endDate
    ) {
      endDate = moment.utc().endOf('day').utcOffset(offset, false).format(DateFormats.SystemDefault);
    } else {
      endDate = moment.utc(endDate).endOf('day').utcOffset(offset, false).format(DateFormats.SystemDefault);
    }

    // GET DAYS DIFFERENCE TO CALTULATE AVERAGE CALL/DAY
    const start = moment.utc(startDate).utcOffset(offset, false);
    const end = moment.utc(endDate).add(1, 'day').utcOffset(offset, false);
    const daysDifference = end.diff(start, 'days');

    return [startDate, endDate, daysDifference];
  }

  async getUsersWithoutItems(results, userFilters) {
    try {
      const { coachId, recruiterId, regionalId } = userFilters;
      let usersId = null;
      const query = Database.table('users')
        .select(['users.id', 'pi.full_name'])
        .innerJoin('personal_informations as pi', 'users.personal_information_id', 'pi.id')
        .where('users.user_status_id', userStatus.Active);
      if (recruiterId) {
        usersId = [recruiterId];
      } else if (coachId) {
        usersId = await RecruiterRepository.recruiterOnTeam(coachId);
      } else if (regionalId) {
        usersId = await RecruiterRepository.coachesByRegion(regionalId);
      }

      if (!usersId) {
        query.innerJoin('user_has_roles as urole', 'users.id', 'urole.user_id').where('urole.role_id', userRoles.Coach);
      } else {
        query.whereIn('users.id', usersId);
      }

      query.orderBy('pi.full_name', 'asc');

      const usersData = await query;
      const resultsWithoutItems = {
        columns: results.columns.filter((column) => column.name === 'full_name' || column.name === 'id'),
        rows: differenceBy(usersData, results.rows, 'id'),
      };
      return {
        code: 200,
        data: resultsWithoutItems,
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      return {
        success: false,
        code: 500,
        message: Antl.formatMessage('messages.error.internalServer', { action: 'retrieving', entity: 'Users list without phone items' })
      };
    }
  }

  async getPhoneLogsLastUpdate(offset){
    try {
      offset *= 1;
      const query = DatabaseAnalytics.table('rc_updated_logs as rc_logs')
        .select(['rc_logs.rc_log_type_id', 'log_types.title'])
        .max('rc_logs.created_at as date_last_update')
        .innerJoin('rc_log_types as log_types', 'log_types.id', 'rc_logs.rc_log_type_id')
        .whereNot('rc_logs.rc_log_status_id', RCLogStatuses.Error)
        .groupBy(['rc_logs.rc_log_type_id', 'log_types.title']);

      const resultUpdates = await query;
      const lastUpdates = resultUpdates.map(resultUpdate => ({
        'dateLastUpdate': moment.utc(resultUpdate.date_last_update).utcOffset(offset, false).format(DateFormats.OnlyTime),
        'rcLogTypeId': resultUpdate.rc_log_type_id,
        'title': resultUpdate.title
      }));

      return {
        code: 200,
        data: lastUpdates
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      return {
        success: false,
        code: 500,
        message: Antl.formatMessage('messages.error.internalServer', { action: 'retrieving', entity: 'Phone logs last update' })
      };
    }
  }

  async notifyNewRecords(){
    try {
      const socketChannel = WebSocketNamespaces.DashboardPhoneLoading;
      const messageOption = 'LastUpdateEnd';
      const antlMessage = Antl.formatMessage(`messages.loading.phoneDashboard.${messageOption}`);
      const resultMessage = await this.sendSocketMessage(socketChannel, antlMessage);

      return {
        code: 200,
        data: { message: resultMessage }
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      return {
        success: false,
        code: 500,
        message: Antl.formatMessage('messages.error.internalServer', { action: 'notifying', entity: 'New phone records' })
      };
    }
  }

  async notifyNewActivityLogs(activityLogs){
    try {
      const socketChannel = WebSocketNamespaces.PhoneActivityLog;
      const result = await this.sendSocketMessage(socketChannel, activityLogs);
      return {
        code: 200,
        data: result
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      return {
        success: false,
        code: 500,
        message: Antl.formatMessage('messages.error.internalServer', { action: 'notifying', entity: 'Phone activity logs' })
      };
    }
  }

  async sendSocketMessage(namespace, data) {
    if(!Ws.io) return;

    const phoneWs = Ws.io.of(namespace);

    if (phoneWs) phoneWs.emit('message', { data });

    return data;
  }

  /**
   * Method to register phone event in activity logs
   *
   * @param {Object} dataEvent
   * @param {Object} user
   * @param {Number} activityLogTypeId
   *
   * @return {Object} activity logs created and success message or only error message
   *
   */
  async registerPhoneActivityLog(dataEvent, user, activityLogTypeId){
    try {
      // VALIDATION TO NOT INSERT THE SAME MESSAGE TWICE (RC WIDGET BUG)
      if(activityLogTypeId === activityLogTypes.SMS){
        if(!dataEvent.id) return this.setInvalidPayload(dataEvent, user, activityLogTypeId);

        if( await this.checkMessageExists(dataEvent.id)){
          return {
            success: false,
            code: 409,
            message: 'Text already exists'
          };
        }
      } else {
        if(!dataEvent.partyData) return this.setInvalidPayload(dataEvent, user, activityLogTypeId);

        if( await this.checkCallExists(dataEvent.partyData.sessionId)){
          return {
            success: false,
            code: 409,
            message: 'Call already exists'
          };
        }
      }

      const phoneNumber = activityLogTypeId === activityLogTypes.Call ? dataEvent.to : dataEvent.to[0].phoneNumber;
      const contacts = await this.getContactInfoByPhone(phoneNumber);
      if (contacts.length === 0) return {
        success: false,
        code: 200,
        message: 'Contact not found to track phone data'
      };

      const activityLogs = await Promise.all(contacts.map(
          contact => this.createActivityLog(contact, dataEvent, user, activityLogTypeId)
        ));

      if(activityLogs.length > 0 && activityLogTypeId === activityLogTypes.SMS){
        await this.storeMessageInsertedActLogs(dataEvent);
      } else if (activityLogs.length > 0 && activityLogTypeId === activityLogTypes.Call) {
        await this.storeCallInsertedActLogs(dataEvent);
      }

      const socketChannel = WebSocketNamespaces.PhoneActivityLog;

      // This is to chunk the activity logs in case there are too many (send 100 at a time in socket payload)
      const chunkLength = 100;
      const groupsActivityLogs = chunk(activityLogs, chunkLength);
      await Promise.all(
        groupsActivityLogs.map(async groupActLog => {
          await this.sendSocketMessage(socketChannel, groupActLog);
        })
      );

      return {
        code: 201,
        data: activityLogs,
      };
    } catch (error) {
      appInsights.defaultClient.trackException({exception: error});

      return {
        success: false,
        code: 500,
        message: Antl.formatMessage('messages.error.internalServer', { action: 'creating', entity: 'Phone Activity Log' })
      };
    }
  }

  setInvalidPayload(dataEvent, user, activityLogTypeId){
    appInsights.defaultClient.trackEvent({
      name: `${activityLogTypeId === activityLogTypes.SMS ? 'Text' : 'Call'} with invalid dataEvent`,
      properties: { dataEvent, user }
    });

    return {
      success: false,
      code: 400,
      message: `${activityLogTypeId === activityLogTypes.SMS ? 'Text' : 'Call'} does not have a unique id`
    }
  }

  async createActivityLog(contact, dataEvent, user, activityLogTypeId) {
    let body;
    let eventDate;
    if (activityLogTypeId === activityLogTypes.Call) {
      let durationCall;
      if (dataEvent.duration){
        durationCall = this.convertSecToMin(dataEvent.duration);
      } else {
        const startTime = moment(dataEvent.startTime);
        const endTime = moment(dataEvent.endTime);
        durationCall = this.convertSecToMin(endTime.diff(startTime, 'seconds'));
      }

      eventDate = dataEvent.startTime;
      body = `<p>From: ${user.full_name}</p><p>To: ${dataEvent.to}</p><p>Direction: ${dataEvent.direction}</p><p>Duration: ${durationCall}</p>`;
    } else {
      eventDate = dataEvent.creationTime;
      const recipientPhoneNumber = dataEvent.to[0].phoneNumber || '';
      body = `<p>From: ${user.full_name}</p><p>To: ${recipientPhoneNumber}</p><p>Direction: ${dataEvent.direction}</p><p>Message: ${dataEvent.subject}</p>`;
    }

    let repository;
    let contactId = contact.origin_table_id;
    switch (contact.role_id) {
      case nameTypes.Name:
        repository = NameRepository;
        break;
      case nameTypes.Candidate:
        repository = CandidateRepository;
        break;
      case nameTypes.HiringAuthority:
        repository = HiringAuthorityRepository;
        break;
      default:
        contactId = contact.id;
        repository = CompanyRepository;
        break;
    }

    // INSERT ACTIVITY LOG ACCORDING TO CONTACT ROLE
    const result = await repository.createActivityLog(
      body,
      activityLogTypeId,
      contactId,
      user.id,
      {
        dateUpdated: eventDate,
        createdBySystem: true,
        metadata: dataEvent
      }
    );

    return result.data;
  }

  async checkCallExists(callSessionId){
    const callExists = DatabaseAnalytics.table('rc_calls_activity_logs')
      .select('id')
      .where('telephony_session_id', callSessionId)
      .first();

    return !!(await callExists);
  }

  async checkMessageExists(messageId){
    const messageExists = DatabaseAnalytics.table('rc_messages_activity_logs')
      .select('id')
      .where('id', messageId)
      .first();

    return !!(await messageExists);
  }

  async storeCallInsertedActLogs(dataCall){
    if (!dataCall) return;

    const callToInsert = {
      id: dataCall.callId,
      to: dataCall.to,
      from: dataCall.fromNumber,
      start_time: moment(dataCall.startTime).format(),
      direction: dataCall.direction,
      telephony_session_id: dataCall.partyData.sessionId,
      created_at: moment().format(),
      updated_at: moment().format()
    };

    return await DatabaseAnalytics.table('rc_calls_activity_logs').insert(callToInsert);
  }

  async storeMessageInsertedActLogs(dataMessage){
    if (!dataMessage) return;

    const messageToInsert = {
      id: dataMessage.id,
      to: dataMessage.to[0],
      from: dataMessage.from,
      type: dataMessage.type,
      creation_time: dataMessage.creationTime,
      attachments: dataMessage.attachments[0],
      direction: dataMessage.direction,
      availability: dataMessage.availability,
      created_at: moment().format(),
      updated_at: moment().format()
    };

    return await DatabaseAnalytics.table('rc_messages_activity_logs').insert(messageToInsert);
  }

  async getContactInfoByPhone(phone){
    try {
      if(!phone) return [];
      const fullRecipientPhoneNumber = parsePhoneNumber(phone);
      const recipientPhoneNumber = fullRecipientPhoneNumber
        ? fullRecipientPhoneNumber.nationalNumber
        : null;

      if(!recipientPhoneNumber) return [];
      
      let contacts = [];
      const queryContactsDirectory = Database.table('contacts_directory as ct_dir')
        .select(['ct_dir.id', 'ct_dir.origin_table_id', 'ct_dir.role_id'])
        .where('ct_dir.phone', recipientPhoneNumber)
        .orWhere('ct_dir.mobile', recipientPhoneNumber);
      contacts = await queryContactsDirectory;

      const queryCompanies = Database.table('companies')
        .select(['companies.id', 'ct.phone'])
        .innerJoin('contacts as ct', 'companies.contact_id', 'ct.id')
        .where('ct.phone', recipientPhoneNumber);
      contacts = contacts.concat(await queryCompanies);

      return contacts || [];
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
      return [];
    }
  }

  /**
   * Send phone metrics summary to coaches by email
   *
   * @method sendEmailCoach
   * 
   * @param {String} timezone
   * 
   * @return {Object} Result or an error code
   */
  async sendEmailCoach(timezone) {
    try {
      if(!timezone) return {
        code: 422,
        success: false,
        response: 'Timezone is required'
      }

      const phoneConfigurationKey = 'phoneMetricsEmail';
      const additionalConfig = await ModulePresetsConfigRepository.getById(phoneConfigurationKey);
      if (!additionalConfig) throw 'Additional email configuration is missing';

      const { emailType } = additionalConfig.data;
      if (!emailType) throw 'Additional email configuration is missing';

      const emailsForTesting = Env.get('EMAILS_FOR_TESTING').split(',');
      if (!emailsForTesting && emailType === 'Test') throw 'Additional email configuration is missing';

      const coaches = (await RecruiterRepository.getCoaches()).filter(coach => coach.timezone === timezone);
      if(coaches.length === 0) return {
        code: 200,
        success: true,
        response: 'There are no coaches in that timezone'
      }

      const foundIanaTimezone = IanaTimezones.find(tz => tz.name === timezone);
      const ianaTimezone = foundIanaTimezone ? foundIanaTimezone.standardIana : 'America/Chicago' ;
      const startDate = moment().tz(ianaTimezone).startOf('day').format();
      const endDate = moment().tz(ianaTimezone).format();
      const dateRange = [ startDate, endDate ];

      const recipients = await Promise.all(
        coaches.map( async (coach, index) => {

          const { totalTeamCallData, totalTeamTextData, items } = await this.getTeamPhoneData(coach.id, dateRange);

          return {
            to: {
              name: coach.personalInformation.full_name,
              email: emailType !== 'Test' ? coach.email : emailsForTesting[index],
            },
            dynamic_template_data: {
              total_call_time: totalTeamCallData.find(item => item.title === 'Total Call Time').total || '0 min',
              total_inbound_calls: totalTeamCallData.find(item => item.title === 'Inbound').total || 0,
              total_outbound_calls: totalTeamCallData.find(item => item.title === 'Outbound').total || 0,
              total_inbound_texts: totalTeamTextData.find(item => item.title === 'Texts Received').total || 0,
              total_outbound_texts: totalTeamTextData.find(item => item.title === 'Texts Sent').total || 0,
              end_time: moment().tz(ianaTimezone).format('h a'),
              items: items
            }
          };
        })
      );
      
      if(recipients.length === 0) return {
        code: 200,
        success: true,
        response: 'There are no recipients to send the email'
      }

      const sendgridConfigurationName = 'PhoneSummaryCoach';
      const generalDynamicTemplateData = null;
        
      const response = await GenericSendgridTemplateEmail.sendViaConfig(
        recipients,
        generalDynamicTemplateData,
        sendgridConfigurationName
      );

      if(!response.success) throw response.message;
      const { sendgridResponse } = response;
      
      return {
        code: 200,
        success: true,
        response: sendgridResponse
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      return {
        success: false,
        code: 500,
        message: Antl.formatMessage('messages.error.internalServer', { action: 'sending', entity: 'Phone Metrics to Coaches' })
      };
    }
  }

  async getTeamPhoneData(coachId, dateRange){
    const {data: totalTeamCallData} = await this.graphTotalCallsData({ coachId: coachId }, dateRange);
    const {data: totalTeamTextData} = await this.graphTotalSMSData({ coachId: coachId }, dateRange);

    const {data: teamCallData} = await this.listCallsInventory({ coachId: coachId }, dateRange);
    const {data: teamWithoutCalls} = await this.getUsersWithoutItems(teamCallData, { coachId: coachId });

    const {data: teamTextData} = await this.listSMSInventory({ coachId: coachId }, dateRange);
    const {data: teamWithoutTexts} = await this.getUsersWithoutItems(teamTextData, { coachId: coachId });

    const teamPhoneData =  orderBy(
      merge(
        keyBy(teamCallData.rows, 'id'),
        keyBy(teamTextData.rows, 'id'),
        keyBy(teamWithoutCalls.rows, 'id'),
        keyBy(teamWithoutTexts.rows, 'id'),
      ),
      ['full_name'],
      ['asc']
    );

    const items = await Promise.all(
      teamPhoneData.map((recruiterPhoneData, index) => {
        return {
          id: recruiterPhoneData.id,
          name: recruiterPhoneData.full_name,
          call_time: recruiterPhoneData.total_time || '0 min',
          inbound_calls: recruiterPhoneData.inbound || 0,
          outbound_calls: recruiterPhoneData.outbound || 0,
          inbound_texts: recruiterPhoneData.received || 0,
          outbound_texts: recruiterPhoneData.sent || 0,
          custom_style: index % 2 === 0
        }
      })
    );

    return {
      totalTeamCallData,
      totalTeamTextData,
      items
    }
  }

  /**
   * Send phone metrics summary to regionals by email
   *
   * @method sendEmailRegional
   * 
   * @param {String} timezone
   * 
   * @return {Object} Result or an error code
   */
  async sendEmailRegional(timezone) {
    try {
      if(!timezone) return {
        code: 422,
        success: false,
        response: 'Timezone is required'
      }

      const phoneConfigurationKey = 'phoneMetricsEmail';
      const additionalConfig = await ModulePresetsConfigRepository.getById(phoneConfigurationKey);
      if (!additionalConfig) throw 'Additional email configuration is missing';

      const { emailType } = additionalConfig.data;
      if (!emailType) throw 'Additional email configuration is missing';

      const emailsForTesting = Env.get('EMAILS_FOR_TESTING').split(',');
      if (!emailsForTesting && emailType === 'Test') throw 'Additional email configuration is missing';

      const regionals = (await RecruiterRepository.getRegionals()).filter(regional => regional.timezone === timezone);
      if(regionals.length === 0) return {
        code: 200,
        success: true,
        response: 'There are no regionals in that timezone'
      }

      const foundIanaTimezone = IanaTimezones.find(tz => tz.name === timezone);
      const ianaTimezone = foundIanaTimezone ? foundIanaTimezone.standardIana : 'America/Chicago' ;
      const startDate = moment().tz(ianaTimezone).startOf('day').format();
      const endDate = moment().tz(ianaTimezone).format();
      const dateRange = [ startDate, endDate ];

      const recipients = await Promise.all(
        regionals.map( async (regional, index) => {
          const coaches = await RecruiterRepository.getCoachesInfoByRegion(regional.id);

          const teams = await Promise.all(
            coaches.map( async coach => {
              
              const { totalTeamCallData, totalTeamTextData, items } = await this.getTeamPhoneData(coach.id, dateRange);

              return {
                coach_first_name: coach.personalInformation.first_name,
                total_call_time: totalTeamCallData.find(item => item.title === 'Total Call Time').total || '0 min',
                total_inbound_calls: totalTeamCallData.find(item => item.title === 'Inbound').total || 0,
                total_outbound_calls: totalTeamCallData.find(item => item.title === 'Outbound').total || 0,
                total_inbound_texts: totalTeamTextData.find(item => item.title === 'Texts Received').total || 0,
                total_outbound_texts: totalTeamTextData.find(item => item.title === 'Texts Sent').total || 0,
                items: items
              };
            })
          );

          return {
            to: {
              name: regional.user_name,
              email: emailType !== 'Test' ? regional.user_email : emailsForTesting[index],
            },
            dynamic_template_data: {
              end_time: moment().tz(ianaTimezone).format('h a'),
              teams: teams
            }
          };
        })
      );

      if(recipients.length === 0) return {
        code: 200,
        success: true,
        response: 'There are no recipients to send the email'
      }

      const sendgridConfigurationName = 'PhoneSummaryRegional';
      const generalDynamicTemplateData = null;
        
      const response = await GenericSendgridTemplateEmail.sendViaConfig(
        recipients,
        generalDynamicTemplateData,
        sendgridConfigurationName
      );

      if(!response.success) throw response.message;
      const { sendgridResponse } = response;
      
      return {
        code: 200,
        success: true,
        response: sendgridResponse
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      return {
        success: false,
        code: 500,
        message: Antl.formatMessage('messages.error.internalServer', { action: 'sending', entity: 'Phone Metrics to Regionals' })
      };
    }
  }
}

module.exports = PhoneRepository;