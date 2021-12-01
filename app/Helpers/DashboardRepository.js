'use strict';

const moment = use('moment');
const appInsights = require('applicationinsights');
const Database = use('Database');
const {
  CandidateTypeSchemes,
  JobOrderTypeSchemes,
  CandidateStatusSchemes,
  JobOrderStatusSchemes,
  activityLogTypes,
  EntityTypes,
  userRoles,
  granularityTimes,
  colorsFromEpic,
} = use('App/Helpers/Globals');
const { groupBy, sumBy, values, concat, merge, toPairs, keyBy, differenceBy } = use('lodash');

// Repositories
const RecruiterRepository = new (use('App/Helpers/RecruiterRepository'))();

const _candidateTypes = [CandidateTypeSchemes.Alpha, CandidateTypeSchemes.Poejo, CandidateTypeSchemes.CantHelp];
const _jobOrderTypes = [JobOrderTypeSchemes.SearchAssignment, JobOrderTypeSchemes.Poejo, JobOrderTypeSchemes.CantHelp];
const _candidateStatus = [
  CandidateStatusSchemes.Ongoing,
  CandidateStatusSchemes.Sendout,
  CandidateStatusSchemes.Sendover,
  CandidateStatusSchemes.Placed,
  CandidateStatusSchemes.Inactive,
];
const _jobOrderStatus = [
  JobOrderStatusSchemes.Ongoing,
  JobOrderStatusSchemes.Sendout,
  JobOrderStatusSchemes.Sendover,
  JobOrderStatusSchemes.Placed,
  JobOrderStatusSchemes.Inactive,
];
class DashboardRepository {
  //Total Inventory Graph
  async graphTotalInventory(userFilters, dateRange, digFilters) {
    try {
      const [startDate, endDate] = dateRange;
      const candidatesByUser = this.totalListByEntity(
        digFilters,
        userFilters,
        startDate,
        endDate,
        false,
        EntityTypes.Candidate
      );
      const companiesByUser = this.totalListByEntity(
        digFilters,
        userFilters,
        startDate,
        endDate,
        false,
        EntityTypes.Company
      );
      const jobsByUser = this.totalListByEntity(
        digFilters,
        userFilters,
        startDate,
        endDate,
        false,
        EntityTypes.JobOrder
      );
      const [totalListCa, totalListCo, totalListJo] = await Promise.all([
        candidatesByUser,
        companiesByUser,
        jobsByUser,
      ]);
      const data = this.formatCountTotalInventory(totalListCa, totalListCo, totalListJo);
      return {
        code: 200,
        data,
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      return {
        code: 500,
        message: 'There was a problem retrieving the data. Please try again',
      };
    }
  }

  formatCountTotalInventory(totalListCa, totalListCo, totalListJo) {
    const totalCa = sumBy(totalListCa, (val) => Number(val.candidates));
    const totalCo = sumBy(totalListCo, (val) => Number(val.companies));
    const totalJo = sumBy(totalListJo, (val) => Number(val.job_orders));
    return [
      {
        title: 'Candidates',
        total: totalCa,
        icon: 'candidate',
      },
      {
        title: 'Job Orders',
        total: totalJo,
        icon: 'jobOrder',
      },
      {
        title: 'Companies',
        total: totalCo,
        icon: 'company',
      },
    ];
  }

  //Graph Candidate ot Job Order Types or Status
  async graphCandidateOrJobOrderTypesOrStatus(userFilters, dateRange, digFilters, entityType, identifier) {
    const [startDate, endDate] = dateRange;
    let results;

    try {
      switch (entityType) {
        case EntityTypes.Candidate:
          results = await this.totalCandidateTypeOrStatus(userFilters, digFilters, startDate, endDate, identifier);
          break;
        case EntityTypes.JobOrder:
          results = await this.totalJobOrdersTypeOrStatus(userFilters, digFilters, startDate, endDate, identifier);
          break;
        default:
          return {
            code: 400,
            message: 'Entity Type not Valid',
          };
      }

      return {
        code: 200,
        data: results,
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      return {
        code: 500,
        message: 'There was a problem retrieving the data. Please try again',
      };
    }
  }

  async totalCandidateTypeOrStatus(userFilters, digFilters, startDate, endDate, identifier) {
    const result = await this.totalListByEntityTypeOrStatus(
      digFilters,
      userFilters,
      startDate,
      endDate,
      EntityTypes.Candidate,
      identifier
    );

    let data;

    if (identifier === 'types') {
      const types = await Database.from('candidate_types').select(['id', 'title', 'style_class_name']);
      data = types.map((type) => {
        return [type.title, sumBy(result, (val) => Number(val[type.id])), type.style_class_name];
      });
    } else if (identifier === 'status') {
      const statuses = await Database.from('candidate_statuses').select(['id', 'title', 'style']);
      data = statuses.map((status) => {
        return [status.title, sumBy(result, (val) => Number(val[status.id])), status.style];
      });
    }

    return data;
  }

  async totalJobOrdersTypeOrStatus(userFilters, digFilters, startDate, endDate, identifier) {
    const result = await this.totalListByEntityTypeOrStatus(
      digFilters,
      userFilters,
      startDate,
      endDate,
      EntityTypes.JobOrder,
      identifier
    );

    let data;

    if (identifier === 'types') {
      const types = await Database.from('job_order_types').select(['id', 'title', 'style_class_name']);
      data = types.map((type) => {
        return [type.title, sumBy(result, (val) => Number(val[type.id])), type.style_class_name];
      });
    } else if (identifier === 'status') {
      const statuses = await Database.from('job_order_statuses').select(['id', 'title', 'style']);
      data = statuses.map((status) => {
        return [status.title, sumBy(result, (val) => Number(val[status.id])), status.style];
      });
    }

    return data;
  }

  //List of Activity
  async listActivity(userFilters, dateRange, digFilters, entityType) {
    try {
      let rows;
      const [startDate, endDate] = dateRange;
      switch (entityType) {
        case EntityTypes.Candidate:
          rows = await this.getActivityNoteByEntity(userFilters, digFilters, startDate, endDate, entityType);
          break;
        case EntityTypes.JobOrder:
          rows = await this.getActivityNoteByEntity(userFilters, digFilters, startDate, endDate, entityType);
          break;
        case EntityTypes.Company:
          rows = await this.getActivityNoteByEntity(userFilters, digFilters, startDate, endDate, entityType);
          break;
        default:
          rows = await this.getAllListActivity(userFilters, digFilters, startDate, endDate);
          break;
      }
      const columns = this.formatLabelsListActivity(userFilters.coachId);
      return {
        code: 200,
        data: {
          columns,
          rows: rows.filter((row) => row.total > 0),
        },
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      return {
        code: 500,
        message: 'There was a problem retrieving the data. Please try again',
      };
    }
  }

  async getAllListActivity(userFilters, digFilters, startDate, endDate) {
    const totalCandidate = this.getActivityNoteByEntity(
      userFilters,
      digFilters,
      startDate,
      endDate,
      EntityTypes.Candidate
    );
    const totalJobOrder = this.getActivityNoteByEntity(
      userFilters,
      digFilters,
      startDate,
      endDate,
      EntityTypes.JobOrder
    );
    const totalCompany = this.getActivityNoteByEntity(userFilters, digFilters, startDate, endDate, EntityTypes.Company);
    const [totalCa, totcalCo, totalJo] = await Promise.all([totalCandidate, totalCompany, totalJobOrder]);
    const data = concat(totalCa, totcalCo, totalJo);
    const groupTitle = groupBy(data, 'full_name');
    return this.formatAllListActivity(groupTitle, true);
  }

  formatLabelsListActivity(coachId) {
    const labels = [
      { label: 'id', name: 'id', options: { display: 'excluded' } },
      { label: coachId ? 'Recruiter' : 'Coach', name: 'full_name', options: { display: true } },
      { label: 'Bulk', name: 'BulkEmail', options: { display: true } },
      { label: 'Email', name: 'Email', options: { display: true } },
      { label: 'Text', name: 'SMS', options: { display: true } },
      { label: 'Call', name: 'Call', options: { display: false } },
      { label: 'Sendout', name: 'Sendout', options: { display: false } },
      { label: 'Job Posting', name: 'JobPosting', options: { display: true } },
      { label: 'Check Personal Inventory', name: 'CheckPersonalInventory', options: { display: false } },
      { label: 'Check Office Inventory', name: 'CheckOfficeInventory', options: { display: false } },
      { label: 'Check PCR and FortPac Inventory', name: 'CheckPCRAndFortPacInventory', options: { display: false } },
      { label: 'Create presentation ', name: 'CreatePresentation', options: { display: false } },
      { label: 'InMail', name: 'SendInmails', options: { display: true } },
      { label: 'Create a roll up/ add to roll up', name: 'CreateRollOrAddRollUp', options: { display: false } },
      { label: 'Create call plan', name: 'CreateCallPlan', options: { display: false } },
      { label: 'General Update', name: 'GeneralUpdate', options: { display: false } },
      { label: 'Pending Offer', name: 'PendingOffer', options: { display: false } },
      { label: 'Offer Sent', name: 'OfferSent', options: { display: false } },
      { label: 'Offer Accepted', name: 'OfferAccepted', options: { display: false } },
      { label: 'References Completed', name: 'ReferencesCompleted', options: { display: false } },
      { label: 'References Release Form Sent', name: 'ReferencesReleaseFormSent', options: { display: false } },
      { label: 'Interview', name: 'Interview', options: { display: false } },
      { label: 'Sendover', name: 'Sendover', options: { display: false } },
      { label: 'Notes', name: 'notes', options: { display: true } },
      { label: 'ZoomInfo Email  ', name: 'ZoomInfoEmail', options: { display: false } },
      { label: 'Linkedin Messages', name: 'LinkedinMessages', options: { display: false } },
      { label: 'Alerts Set Up', name: 'AlertsSetUp', options: { display: false } },
      { label: 'Linkedin Status Update', name: 'LinkedinStatusUpdate', options: { display: false } },
      { label: 'Automatic Call', name: 'AutomaticCall', options: { display: false } },
      { label: 'Automatic Text', name: 'AutomaticText', options: { display: false } },
      { label: 'Sendover Conversion as Sendout', name: 'ConversionOfSendover', options: { display: false } },
      { label: 'Sendout Marked as Offer Declined', name: 'Declined', options: { display: false } },
      { label: 'Sendout Marked as No Offer', name: 'NoOffer', options: { display: false } },
      { label: 'Sendover Marked as Offer Declined', name: 'SendoverDeclined', options: { display: false } },
      { label: 'Sendover Marked as No Offer', name: 'SendoverNoOffer', options: { display: false } },
      { label: 'Total Activities', name: 'total', options: { display: true } },
      { label: 'Sendout Marked as Placed', name: 'SendoutPlaced', options: { display: true } },
    ];
    return labels;
  }

  formatAllListActivity(data, isAllListing) {
    return values(data).map((objs) => {
      const body = isAllListing ? objs[0] : objs;
      return Object.assign(
        ...Object.keys(body).map((key) => ({
          [key]:
            key === 'id' || key === 'full_name'
              ? body[key]
              : isAllListing
              ? sumBy(objs, (val) => Number(val[key]))
              : Number(body[key]),
        }))
      );
    });
  }

  applyGroupUsersClause(query, coachId) {
    if (!coachId) {
      query.where('ur.role_id', userRoles.Coach);
    }
    query.groupByRaw('usr.id,usrpi.full_name').orderBy('usrpi.full_name');
  }

  buildJsonCountsQuery(tableName) {
    const activities = toPairs(activityLogTypes);
    let json_build_object = `json_build_object(`;
    activities.map((activity) => {
      json_build_object += `'${activity[0]}',COUNT(distinct(${tableName}.id))  filter (where ${tableName}.activity_log_type_id = ${activity[1]}),`;
    });
    json_build_object += `'total',COUNT(distinct(${tableName}.id)))`;
    return json_build_object;
  }

  buildCandidateActivityQuery(startDate, endDate, digFilters, userFilters) {
    const subQueryAct = Database.from('candidate_activity_logs as cl');
    subQueryAct.select([Database.raw(`${this.buildJsonCountsQuery('cl')}`)]);
    subQueryAct.leftJoin('candidates as ca', 'cl.candidate_id', 'ca.id');
    this.applycandidateBaseRelations(subQueryAct);
    subQueryAct.whereRaw(
      `${
        userFilters.recruiterId || userFilters.coachId
          ? '(cl.user_id = usr.id )'
          : '(cl.user_id  in (select distinct(recruiter_id) from recruiter_has_industries where coach_id = usr.id) or cl.user_id  = usr.id)'
      }`
    );
    this.applyQueryWhereClauseDate(startDate, endDate, subQueryAct, 'cl');
    this.applyWhereClause(digFilters, subQueryAct);
    return subQueryAct;
  }

  buildCandidateNoteQuery(startDate, endDate, digFilters, userFilters) {
    const subQueryNote = Database.from('candidate_notes as cn');
    subQueryNote.countDistinct(`cn.id as notes`);
    subQueryNote.leftJoin('candidates as ca', 'cn.candidate_id', 'ca.id');
    this.applycandidateBaseRelations(subQueryNote);
    subQueryNote.whereRaw(
      `${
        userFilters.recruiterId || userFilters.coachId
          ? '(cn.user_id = usr.id )'
          : '(cn.user_id  in (select distinct(recruiter_id) from recruiter_has_industries where coach_id = usr.id) or cn.user_id  = usr.id)'
      }`
    );
    this.applyQueryWhereClauseDate(startDate, endDate, subQueryNote, 'cn');
    this.applyWhereClause(digFilters, subQueryNote);
    return subQueryNote;
  }

  buildJobOrderActivityQuery(startDate, endDate, digFilters, userFilters) {
    const subQueryAct = Database.from('job_order_activity_logs as jl');
    subQueryAct.select([Database.raw(`${this.buildJsonCountsQuery('jl')}`)]);
    subQueryAct.leftJoin('job_orders as jo', 'jl.job_order_id', 'jo.id');
    this.applyJobBaseRelations(subQueryAct);
    subQueryAct.whereRaw(
      `${
        userFilters.recruiterId || userFilters.coachId
          ? '(jl.user_id = usr.id )'
          : '(jl.user_id  in (select distinct(recruiter_id) from recruiter_has_industries where coach_id = usr.id) or jl.user_id  = usr.id)'
      }`
    );
    this.applyQueryWhereClauseDate(startDate, endDate, subQueryAct, 'jl');
    this.applyWhereClause(digFilters, subQueryAct);
    return subQueryAct;
  }

  buildJobOrderNoteQuery(startDate, endDate, digFilters, userFilters) {
    const subQueryNote = Database.from('job_order_notes as jn');
    subQueryNote.countDistinct(`jn.id as notes`);
    subQueryNote.leftJoin('job_orders as jo', 'jn.job_order_id', 'jo.id');
    this.applyJobBaseRelations(subQueryNote);
    subQueryNote.whereRaw(
      `${
        userFilters.recruiterId || userFilters.coachId
          ? '(jn.user_id = usr.id )'
          : '(jn.user_id  in (select distinct(recruiter_id) from recruiter_has_industries where coach_id = usr.id) or jn.user_id  = usr.id)'
      }`
    );
    this.applyQueryWhereClauseDate(startDate, endDate, subQueryNote, 'jn');
    this.applyWhereClause(digFilters, subQueryNote);
    return subQueryNote;
  }

  buildCompanyActivityQuery(startDate, endDate, digFilters, userFilters) {
    const subQueryAct = Database.from('company_activity_logs as cpl');
    subQueryAct.select([Database.raw(`${this.buildJsonCountsQuery('cpl')}`)]);
    subQueryAct.leftJoin('companies as cp', 'cpl.company_id', 'cp.id');
    this.applyCompanyBaseRelations(subQueryAct);
    subQueryAct.whereRaw(
      `${
        userFilters.recruiterId || userFilters.coachId
          ? '(cpl.user_id = usr.id )'
          : '(cpl.user_id  in (select distinct(recruiter_id) from recruiter_has_industries where coach_id = usr.id) or cpl.user_id  = usr.id)'
      }`
    );
    this.applyQueryWhereClauseDate(startDate, endDate, subQueryAct, 'cpl');
    this.applyWhereClause(digFilters, subQueryAct);
    return subQueryAct;
  }

  buildCompanyNoteQuery(startDate, endDate, digFilters, userFilters) {
    const subQueryNote = Database.from('company_notes as cpn');
    subQueryNote.countDistinct(`cpn.id as notes`);
    subQueryNote.leftJoin('companies as cp', 'cpn.company_id', 'cp.id');
    this.applyCompanyBaseRelations(subQueryNote);
    subQueryNote.whereRaw(
      `${
        userFilters.recruiterId || userFilters.coachId
          ? '(cpn.user_id = usr.id )'
          : '(cpn.user_id  in (select distinct(recruiter_id) from recruiter_has_industries where coach_id = usr.id) or cpn.user_id  = usr.id)'
      }`
    );
    this.applyQueryWhereClauseDate(startDate, endDate, subQueryNote, 'cpn');
    this.applyWhereClause(digFilters, subQueryNote);
    return subQueryNote;
  }

  async getActivityNoteByEntity(userFilters, digFilters, startDate, endDate, entityType) {
    const queryAct = Database.from('users as usr');
    queryAct.select([
      'usr.id',
      'usrpi.full_name',
      entityType == EntityTypes.Candidate
        ? Database.raw(`(${this.buildCandidateActivityQuery(startDate, endDate, digFilters, userFilters)})`)
        : entityType == EntityTypes.JobOrder
        ? Database.raw(`(${this.buildJobOrderActivityQuery(startDate, endDate, digFilters, userFilters)})`)
        : Database.raw(`(${this.buildCompanyActivityQuery(startDate, endDate, digFilters, userFilters)})`),
    ]);
    queryAct
      .leftJoin('personal_informations as usrpi', 'usr.personal_information_id', 'usrpi.id')
      .leftJoin('user_has_roles as ur', ' usr.id', 'ur.user_id')
      .joinRaw(
        `left join recruiter_has_industries as rhi on usr.id = ${
          userFilters.coachId || userFilters.recruiterId ? 'recruiter_id' : 'coach_id'
        }`
      );
    this.applyGroupUsersClause(queryAct, userFilters.coachId || userFilters.regionalId);
    this.applyWhereClauseCustomTable(digFilters, queryAct, 'rhi');
    await this.applyWhereClauseUser(userFilters, queryAct, 'usr', 'id', false);

    const queryNote = Database.from('users as usr');
    queryNote.select([
      'usr.id',
      'usrpi.full_name',
      entityType == EntityTypes.Candidate
        ? Database.raw(`(${this.buildCandidateNoteQuery(startDate, endDate, digFilters, userFilters)})`)
        : entityType == EntityTypes.JobOrder
        ? Database.raw(`(${this.buildJobOrderNoteQuery(startDate, endDate, digFilters, userFilters)})`)
        : Database.raw(`(${this.buildCompanyNoteQuery(startDate, endDate, digFilters, userFilters)})`),
    ]);
    queryNote
      .leftJoin('personal_informations as usrpi', 'usr.personal_information_id', 'usrpi.id')
      .leftJoin('user_has_roles as ur', ' usr.id', 'ur.user_id')
      .joinRaw(
        `left join recruiter_has_industries as rhi on usr.id = ${
          userFilters.coachId || userFilters.recruiterId ? 'recruiter_id' : 'coach_id'
        }`
      );
    this.applyGroupUsersClause(queryNote, userFilters.coachId || userFilters.regionalId);
    this.applyWhereClauseCustomTable(digFilters, queryNote, 'rhi');
    await this.applyWhereClauseUser(userFilters, queryNote, 'usr', 'id', false);

    const resultAct = await queryAct;
    const resultNote = await queryNote;
    const result = resultAct.map((value, key) => ({
      id: value.id,
      full_name: value.full_name,
      ...value.json_build_object,
      notes: resultNote[key].notes,
      total: Number(value.json_build_object.total) + Number(resultNote[key].notes),
    }));
    return this.formatAllListActivity(result, false);
  }

  //Activity and Notes In Time
  async lineGraphTotalActivityNote(
    userFilters,
    dateRange,
    digFilters,
    offset,
    granularity = granularityTimes.Automatic
  ) {
    try {
      const [startDate, endDate] = dateRange;
      granularity = this.getGranularity(granularity, startDate, endDate);
      const totalCandidate = this.totalCandidateInTime(userFilters, digFilters, granularity, startDate, endDate);
      const totalCompany = this.totalCompanyInTime(userFilters, digFilters, granularity, startDate, endDate);
      const totalJobOrder = this.totalJobOrderInTime(userFilters, digFilters, granularity, startDate, endDate);
      const [totalCa, totcalCo, totalJo] = await Promise.all([totalCandidate, totalCompany, totalJobOrder]);
      const data = concat(totalCa, totcalCo, totalJo);
      const groupSerie = groupBy(data, 'serie_time');
      const series = this.formatLabelsLineGraphActivity();
      const result = this.formatLineGraphActivity(groupSerie, granularity, offset);
      return {
        code: 200,
        data: {
          series,
          granularity,
          data: result,
        },
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      return {
        code: 500,
        message: 'There was a problem retrieving the data. Please try again',
      };
    }
  }

  formatLabelsLineGraphActivity() {
    const labels = [
      { label: 'Time', type: 'date' },
      { label: 'Bulk', type: 'number' },
      { label: 'Email', type: 'number' },
      { label: 'SMS', type: 'number' },
      { label: 'Job Posting', type: 'number' },
      { label: 'InMails', type: 'number' },
      { label: 'Notes', type: 'number' },
    ];
    return labels.map((val, key) => ({
      ...val,
      color: colorsFromEpic[key],
    }));
  }

  formatLineGraphActivity(data, granularity, offset) {
    offset *= -1;
    return values(data).map((objs) => [
      granularity[1] != 'hour'
        ? moment.utc(objs[0].serie_time).utcOffset(offset, false).format('YYYY-MM-DD HH:mm:ss')
        : objs[0].serie_time,
      sumBy(objs, (val) => Number(val.bulk)),
      sumBy(objs, (val) => Number(val.email)),
      sumBy(objs, (val) => Number(val.sms)),
      sumBy(objs, (val) => Number(val.inmails)),
      sumBy(objs, (val) => Number(val.posting)),
      sumBy(objs, (val) => Number(val.notes)),
    ]);
  }

  countsLineGraphActivity(query, tableName, granularity) {
    query.select([
      Database.raw(`date_trunc('${granularity[1]}',${tableName}.created_at) as time_format`),
      Database.raw(
        `COUNT(distinct(${tableName}.id)) filter (where ${tableName}.activity_log_type_id = ${activityLogTypes.BulkEmail}) as "bulk"`
      ),
      Database.raw(
        `COUNT(distinct(${tableName}.id)) filter (where ${tableName}.activity_log_type_id = ${activityLogTypes.Email}) as "email"`
      ),
      Database.raw(
        `COUNT(distinct(${tableName}.id)) filter (where ${tableName}.activity_log_type_id = ${activityLogTypes.SMS}) as "sms"`
      ),
      Database.raw(
        `COUNT(distinct(${tableName}.id)) filter (where ${tableName}.activity_log_type_id = ${activityLogTypes.JobPosting}) as "posting"`
      ),
      Database.raw(
        `COUNT(distinct(${tableName}.id)) filter (where ${tableName}.activity_log_type_id = ${activityLogTypes.SendInmails}) as "inmails"`
      ),
    ]);
  }

  async applySeriesWithActivities(subQueryAct, subQueryNote, granularity, startDate, endDate) {
    const queryWithSeries = Database.with(
      'series',
      Database.raw(`select date_trunc('${
        granularity[1]
      }',serie) as serie_time from generate_series('${startDate}'::timestamp at time zone 'utc','${endDate}'::timestamp at time zone 'utc','${granularity.join(
        ' '
      )}'::interval) serie),
                    activity_counts as (${subQueryAct}), note_count as (${subQueryNote}`)
    )
      .select(['table_one.*', 'table_two.notes'])
      .from(
        Database.raw(`
            (select series.serie_time,
              coalesce(sum(activity_counts.bulk), 0) as bulk,
              coalesce(sum(activity_counts.email), 0) as email,
              coalesce(sum(activity_counts.sms), 0) as sms,
              coalesce(sum(activity_counts.posting), 0) as posting,
              coalesce(sum(activity_counts.inmails), 0) as inmails from series
              left outer join activity_counts  on activity_counts.time_format >= series.serie_time and  activity_counts.time_format <  series.serie_time + '${granularity.join(
                ' '
              )}'
              group by series.serie_time order by series.serie_time asc
            ) table_one
            inner join 
            (select series.serie_time, 
              coalesce(sum(note_count.notes),0) as notes from series
              left outer join note_count on note_count.time_format >= series.serie_time and   note_count.time_format <  series.serie_time + '${granularity.join(
                ' '
              )}'
              group by series.serie_time order by series.serie_time asc
            ) table_two on (table_one.serie_time=table_two.serie_time)
      `)
      );
    return await queryWithSeries;
  }

  async totalCandidateInTime(userFilters, digFilters, granularity, startDate, endDate) {
    const subQueryAct = Database.from('candidates as ca');
    this.countsLineGraphActivity(subQueryAct, 'cl', granularity, startDate, endDate);
    subQueryAct
      .from('candidates as ca')
      .innerJoin('candidate_activity_logs as cl', 'ca.id', 'cl.candidate_id')
      .innerJoin('activity_log_types as al', 'cl.activity_log_type_id', 'al.id');
    this.applycandidateBaseRelations(subQueryAct);
    subQueryAct.groupBy('time_format');
    await this.applyQueryWhereClauseDate(startDate, endDate, subQueryAct, 'cl');
    await this.applyWhereClause(digFilters, subQueryAct);
    await this.applyWhereClauseUser(userFilters, subQueryAct, 'cl', 'user_id', false, true);

    const subQueryNote = Database.from('candidates as ca');
    subQueryNote
      .select([
        Database.raw(`date_trunc('${granularity[1]}',cn.created_at) as time_format`),
        Database.raw('count(distinct(cn.id)) as notes'),
      ])
      .innerJoin('candidate_notes as cn', 'ca.id', 'cn.candidate_id');
    this.applycandidateBaseRelations(subQueryNote);
    subQueryNote.groupBy('time_format');
    await this.applyQueryWhereClauseDate(startDate, endDate, subQueryNote, 'cn');
    await this.applyWhereClause(digFilters, subQueryNote);
    await this.applyWhereClauseUser(userFilters, subQueryNote, 'cn', 'user_id', false);

    return await this.applySeriesWithActivities(subQueryAct, subQueryNote, granularity, startDate, endDate);
  }

  async totalJobOrderInTime(userFilters, digFilters, granularity, startDate, endDate) {
    const subQueryAct = Database.from('job_orders as jo');
    this.countsLineGraphActivity(subQueryAct, 'jl', granularity, startDate, endDate);
    subQueryAct
      .from('job_orders as jo')
      .innerJoin('job_order_activity_logs as jl', 'jo.id', 'jl.job_order_id')
      .innerJoin('activity_log_types as al', 'jl.activity_log_type_id', 'al.id');
    this.applyJobBaseRelations(subQueryAct);
    subQueryAct.groupBy('time_format');
    await this.applyQueryWhereClauseDate(startDate, endDate, subQueryAct, 'jl');
    await this.applyWhereClause(digFilters, subQueryAct);
    await this.applyWhereClauseUser(userFilters, subQueryAct, 'jl', 'user_id', false, true);

    const subQueryNote = Database.from('job_orders as jo');
    subQueryNote
      .select([
        Database.raw(`date_trunc('${granularity[1]}',jn.created_at) as time_format`),
        Database.raw('count(distinct(jn.id)) as notes'),
      ])
      .innerJoin('job_order_notes as jn', 'jo.id', 'jn.job_order_id');
    this.applyJobBaseRelations(subQueryNote);
    subQueryNote.groupBy('time_format');
    await this.applyQueryWhereClauseDate(startDate, endDate, subQueryNote, 'jn');
    await this.applyWhereClause(digFilters, subQueryNote);
    await this.applyWhereClauseUser(userFilters, subQueryNote, 'jn', 'user_id', false);

    return await this.applySeriesWithActivities(subQueryAct, subQueryNote, granularity, startDate, endDate);
  }

  async totalCompanyInTime(userFilters, digFilters, granularity, startDate, endDate) {
    const subQueryAct = Database.from('companies as cp');
    this.countsLineGraphActivity(subQueryAct, 'cpl', granularity, startDate, endDate);
    subQueryAct
      .from('companies as cp')
      .innerJoin('company_activity_logs as cpl', 'cp.id', 'cpl.company_id')
      .innerJoin('activity_log_types as al', 'cpl.activity_log_type_id', 'al.id');
    this.applyCompanyBaseRelations(subQueryAct);
    subQueryAct.groupBy('time_format');
    await this.applyQueryWhereClauseDate(startDate, endDate, subQueryAct, 'cpl');
    await this.applyWhereClause(digFilters, subQueryAct);
    await this.applyWhereClauseUser(userFilters, subQueryAct, 'cpl', 'user_id', false, true);

    const subQueryNote = Database.from('companies as cp');
    subQueryNote
      .select([
        Database.raw(`date_trunc('${granularity[1]}',cpn.created_at) as time_format`),
        Database.raw('count(distinct(cpn.id)) as notes'),
      ])
      .innerJoin('company_notes as cpn', 'cp.id', 'cpn.company_id');
    this.applyCompanyBaseRelations(subQueryNote);
    subQueryNote.groupBy('time_format');
    await this.applyQueryWhereClauseDate(startDate, endDate, subQueryNote, 'cpn');
    await this.applyWhereClause(digFilters, subQueryNote);
    await this.applyWhereClauseUser(userFilters, subQueryNote, 'cpn', 'user_id', false);

    return await this.applySeriesWithActivities(subQueryAct, subQueryNote, granularity, startDate, endDate);
  }

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

  //List Candidate or Job Types by User
  async listCandidateOrJobOrderTypesOrStatus(userFilters, dateRange, digFilters, entityType, identifier) {
    let columns, rows;

    try {
      const [startDate, endDate] = dateRange;

      switch (entityType) {
        case EntityTypes.Candidate:
          [columns, rows] = await this.totalListTypeCandidate(userFilters, digFilters, startDate, endDate, identifier);
          break;
        case EntityTypes.JobOrder:
          [columns, rows] = await this.totalListTypeJobOrder(userFilters, digFilters, startDate, endDate, identifier);
          break;
        default:
          return {
            code: 400,
            message: 'Entity Type not Valid',
          };
      }

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
        message: 'There was a problem retrieving the data. Please try again',
      };
    }
  }

  async totalListTypeCandidate(userFilters, digFilters, startDate, endDate, identifier) {
    const result = await this.totalListByEntityTypeOrStatus(
      digFilters,
      userFilters,
      startDate,
      endDate,
      EntityTypes.Candidate,
      identifier
    );

    const columns =
      identifier === 'types'
        ? [
            { label: 'id', name: 'id', options: { display: 'excluded' } },
            { label: userFilters.coachId ? 'Recruiter' : 'Coach', name: 'full_name', options: { display: true } },
            { label: 'Alpha', name: 'alpha', options: { display: true } },
            { label: 'POEJO', name: 'poejo', options: { display: true } },
            { label: "Can't Help", name: 'cant', options: { display: true } },
          ]
        : [
            { label: 'id', name: 'id', options: { display: 'excluded' } },
            { label: userFilters.coachId ? 'Recruiter' : 'Coach', name: 'full_name', options: { display: true } },
            { label: 'Ongoing', name: 'ongoing', options: { display: true } },
            { label: 'Sendout', name: 'sendout', options: { display: true } },
            { label: 'Sendover', name: 'sendover', options: { display: true } },
            { label: 'Placed', name: 'placed', options: { display: true } },
            { label: 'Inactive', name: 'inactive', options: { display: true } },
          ];

    const rows = result.map((value) =>
      identifier === 'types'
        ? {
            id: value.id,
            full_name: value.full_name,
            alpha: Number(value[CandidateTypeSchemes.Alpha]),
            poejo: Number(value[CandidateTypeSchemes.Poejo]),
            cant: Number(value[CandidateTypeSchemes.CantHelp]),
          }
        : {
            id: value.id,
            full_name: value.full_name,
            ongoing: Number(value[CandidateStatusSchemes.Ongoing]),
            sendout: Number(value[CandidateStatusSchemes.Sendout]),
            sendover: Number(value[CandidateStatusSchemes.Sendover]),
            placed: Number(value[CandidateStatusSchemes.Placed]),
            inactive: Number(value[CandidateStatusSchemes.Inactive]),
          }
    );

    return [columns, rows];
  }

  async totalListTypeJobOrder(userFilters, digFilters, startDate, endDate, identifier) {
    const result = await this.totalListByEntityTypeOrStatus(
      digFilters,
      userFilters,
      startDate,
      endDate,
      EntityTypes.JobOrder,
      identifier
    );
    const columns =
      identifier === 'types'
        ? [
            { label: 'id', name: 'id', options: { display: 'excluded' } },
            { label: userFilters.coachId ? 'Recruiter' : 'Coach', name: 'full_name', options: { display: true } },
            { label: 'Search Assignment', name: 'search', options: { display: true } },
            { label: 'POEJO', name: 'poejo', options: { display: true } },
            { label: "Can't Help", name: 'cant', options: { display: true } },
          ]
        : [
            { label: 'id', name: 'id', options: { display: 'excluded' } },
            { label: userFilters.coachId ? 'Recruiter' : 'Coach', name: 'full_name', options: { display: true } },
            { label: 'Ongoing', name: 'ongoing', options: { display: true } },
            { label: 'Sendout', name: 'sendout', options: { display: true } },
            { label: 'Sendover', name: 'sendover', options: { display: true } },
            { label: 'Placed', name: 'placed', options: { display: true } },
            { label: 'Inactive', name: 'inactive', options: { display: true } },
          ];
    const rows = result.map((value) =>
      identifier === 'types'
        ? {
            id: value.id,
            full_name: value.full_name,
            search: Number(value[JobOrderTypeSchemes.SearchAssignment]),
            poejo: Number(value[JobOrderTypeSchemes.Poejo]),
            cant: Number(value[JobOrderTypeSchemes.CantHelp]),
          }
        : {
            id: value.id,
            full_name: value.full_name,
            ongoing: Number(value[JobOrderStatusSchemes.Ongoing]),
            sendout: Number(value[JobOrderStatusSchemes.Sendout]),
            sendover: Number(value[JobOrderStatusSchemes.Sendover]),
            placed: Number(value[JobOrderStatusSchemes.Placed]),
            inactive: Number(value[JobOrderStatusSchemes.Inactive]),
          }
    );

    return [columns, rows];
  }

  //Total List Inventory
  async listInventory(userFilters, dateRange, digFilters) {
    try {
      const [startDate, endDate] = dateRange;
      const totalCandidate = this.totalListByEntity(
        digFilters,
        userFilters,
        startDate,
        endDate,
        false,
        EntityTypes.Candidate
      );
      const totalCompany = this.totalListByEntity(
        digFilters,
        userFilters,
        startDate,
        endDate,
        false,
        EntityTypes.Company
      );
      const totalJobOrder = this.totalListByEntity(
        digFilters,
        userFilters,
        startDate,
        endDate,
        false,
        EntityTypes.JobOrder
      );
      const [totalCa, totcalCo, totalJo] = await Promise.all([totalCandidate, totalCompany, totalJobOrder]);
      const data = merge(keyBy(totalCa, 'id'), keyBy(totcalCo, 'id'), keyBy(totalJo, 'id'));
      const [rows, columns] = this.formatListInventory(data, userFilters.coachId);
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
        message: 'There was a problem retrieving the data. Please try again',
      };
    }
  }

  formatListInventory(data, coachId) {
    const columns = [
      { label: 'id', name: 'id', options: { display: 'excluded' } },
      { label: coachId ? 'Recruiter' : 'Coach', name: 'full_name', options: { display: true } },
      { label: 'Candidates', name: 'candidates', options: { display: true } },
      { label: 'Job Orders', name: 'job_orders', options: { display: true } },
      { label: 'Companies', name: 'companies', options: { display: true } },
      { label: 'Total', name: 'total', options: { display: true } },
    ];
    const rows = Object.keys(data).map((key) => {
      const val = data[key];
      const totalCa = Number(val.candidates) || 0;
      const totalJo = Number(val.job_orders) || 0;
      const totalCo = Number(val.companies) || 0;
      return {
        id: val.id,
        full_name: val.full_name,
        candidates: totalCa,
        job_orders: totalJo,
        companies: totalCo,
        total: totalCa + totalCo + totalJo,
      };
    });
    return [rows, columns];
  }

  async totalListByEntity(digFilters, userFilters, startDate, endDate, bySheetType, entity) {
    let queryEntity;
    let entityTypes;
    let totalEntityName;

    switch (entity) {
      case EntityTypes.Candidate:
        queryEntity = this.totalListCandidate(digFilters, startDate, endDate, bySheetType);
        entityTypes = _candidateTypes;
        totalEntityName = 'candidates';
        break;
      case EntityTypes.JobOrder:
        queryEntity = this.totalListJobOrder(digFilters, startDate, endDate, bySheetType);
        entityTypes = _jobOrderTypes;
        totalEntityName = 'job_orders';
        break;
      case EntityTypes.Company:
        queryEntity = this.totalListCompany(digFilters, startDate, endDate);
        totalEntityName = 'companies';
        break;
    }

    let select_agregate = [];

    if (bySheetType) {
      select_agregate = entityTypes.map((type) => Database.raw(`SUM(sq."${type}") as "${type}"`));
    } else {
      select_agregate = [Database.raw(`SUM(sq.total) as ${totalEntityName}`)];
    }

    const query = Database.from('users as usr')
      .select([...select_agregate, 'usr.id', 'usrpi.full_name'])
      .leftJoin('personal_informations as usrpi', 'usr.personal_information_id', 'usrpi.id')
      .leftJoin('user_has_roles as ur', ' usr.id', 'ur.user_id').joinRaw(`
        inner join (${queryEntity})
        sq on usr.id = sq.${userFilters.coachId ? 'recruiter_id' : 'coach_id'}
    `);
    await this.applyWhereClauseUser(userFilters, query, 'usr', 'id', false);
    this.applyGroupUsersClause(query, userFilters.coachId);

    return await query;
  }

  totalListCandidate(digFilters, startDate, endDate, bySheetType) {
    const select_values = [
      `ca.recruiter_id`,
      Database.raw(`CASE WHEN sb.coach_id is null THEN ca.recruiter_id ELSE sb.coach_id END coach_id`),
    ];
    const query = Database.from('candidates as ca');

    if (bySheetType) {
      query.select([
        ...this.getRawFilterByTypesOrStatus('ca', 'bsh.candidate_type_id', _candidateTypes),
        ...select_values,
      ]);
      query.innerJoin('blue_sheets as bsh', 'ca.id', 'bsh.candidate_id');
    } else {
      query.select([Database.raw(`COUNT(distinct(ca.id)) as total`), ...select_values]);
    }

    this.applycandidateBaseRelations(query);
    query.joinRaw(
      `left join (select distinct coach_id,recruiter_id from recruiter_has_industries)sb on sb.recruiter_id = ca.recruiter_id`
    );
    this.applyQueryWhereClauseDate(startDate, endDate, query, 'ca');
    this.applyWhereClause(digFilters, query);
    query.groupByRaw('ca.recruiter_id,CASE WHEN sb.coach_id is null THEN ca.recruiter_id ELSE sb.coach_id END');
    return query;
  }

  totalListCompany(digFilters, startDate, endDate) {
    const query = Database.from('companies as cp');
    query.select([
      Database.raw(`COUNT(distinct(cp.id)) as total`),
      `cp.recruiter_id`,
      Database.raw(`CASE WHEN sb.coach_id is null THEN cp.recruiter_id ELSE sb.coach_id END coach_id`),
    ]);

    this.applyCompanyBaseRelations(query);
    query.joinRaw(
      `left join (select distinct coach_id,recruiter_id from recruiter_has_industries)sb on sb.recruiter_id = cp.recruiter_id`
    );
    this.applyQueryWhereClauseDate(startDate, endDate, query, 'cp');
    this.applyWhereClause(digFilters, query);
    query.groupByRaw('cp.recruiter_id,CASE WHEN sb.coach_id is null THEN cp.recruiter_id ELSE sb.coach_id END');
    return query;
  }

  totalListJobOrder(digFilters, startDate, endDate, bySheetType) {
    const select_values = [
      `jo.recruiter_id`,
      Database.raw(`CASE WHEN sb.coach_id is null THEN jo.recruiter_id ELSE sb.coach_id END coach_id`),
    ];
    const query = Database.from('job_orders as jo');
    if (bySheetType) {
      query.select([
        ...this.getRawFilterByTypesOrStatus('jo', 'wsh.job_order_type_id', _jobOrderTypes),
        ...select_values,
      ]);
      query.innerJoin('white_sheets as wsh', 'jo.id', 'wsh.job_order_id');
    } else {
      query.select([Database.raw(`COUNT(distinct(jo.id)) as total`), ...select_values]);
    }
    this.applyJobBaseRelations(query);
    query.joinRaw(
      `left join (select distinct coach_id,recruiter_id from recruiter_has_industries)sb on sb.recruiter_id = jo.recruiter_id`
    );
    this.applyQueryWhereClauseDate(startDate, endDate, query, 'jo');
    this.applyWhereClause(digFilters, query);
    query.groupByRaw('jo.recruiter_id,CASE WHEN sb.coach_id is null THEN jo.recruiter_id ELSE sb.coach_id END');
    return query;
  }

  async totalListByEntityTypeOrStatus(digFilters, userFilters, startDate, endDate, entity, identifier) {
    let queryEntity;
    let entityTypes;

    switch (entity) {
      case EntityTypes.Candidate:
        queryEntity = this.totalListCandidateByTypeOrStatus(digFilters, startDate, endDate, identifier);
        entityTypes = identifier === 'types' ? _candidateTypes : _candidateStatus;
        break;
      case EntityTypes.JobOrder:
        queryEntity = this.totalListJobOrderByTypeOrStatus(digFilters, startDate, endDate, identifier);
        entityTypes = identifier === 'types' ? _jobOrderTypes : _jobOrderStatus;
        break;
    }

    const select_agregate = entityTypes.map((type) => Database.raw(`SUM(sq."${type}") as "${type}"`));

    const query = Database.from('users as usr')
      .select([...select_agregate, 'usr.id', 'usrpi.full_name'])
      .leftJoin('personal_informations as usrpi', 'usr.personal_information_id', 'usrpi.id')
      .leftJoin('user_has_roles as ur', ' usr.id', 'ur.user_id').joinRaw(`
        inner join (${queryEntity})
        sq on usr.id = sq.${userFilters.coachId ? 'recruiter_id' : 'coach_id'}
    `);
    await this.applyWhereClauseUser(userFilters, query, 'usr', 'id', false);
    this.applyGroupUsersClause(query, userFilters.coachId);

    return await query;
  }

  totalListCandidateByTypeOrStatus(digFilters, startDate, endDate, identifier) {
    const select_values = [
      `ca.recruiter_id`,
      Database.raw(`CASE WHEN sb.coach_id is null THEN ca.recruiter_id ELSE sb.coach_id END coach_id`),
    ];
    const query = Database.from('candidates as ca');

    if (identifier === 'types') {
      query.select([
        ...this.getRawFilterByTypesOrStatus('ca', 'bsh.candidate_type_id', _candidateTypes),
        ...select_values,
      ]);
      query.innerJoin('blue_sheets as bsh', 'ca.id', 'bsh.candidate_id');
    } else if (identifier === 'status') {
      query.select([...this.getRawFilterByTypesOrStatus('ca', 'ca.status_id', _candidateStatus), ...select_values]);
    }

    this.applycandidateBaseRelations(query);
    query.joinRaw(
      `left join (select distinct coach_id, recruiter_id from recruiter_has_industries) sb on sb.recruiter_id = ca.recruiter_id`
    );
    this.applyQueryWhereClauseDate(startDate, endDate, query, 'ca');
    this.applyWhereClause(digFilters, query);
    query.groupByRaw('ca.recruiter_id,CASE WHEN sb.coach_id is null THEN ca.recruiter_id ELSE sb.coach_id END');

    return query;
  }

  totalListJobOrderByTypeOrStatus(digFilters, startDate, endDate, identifier) {
    const select_values = [
      `jo.recruiter_id`,
      Database.raw(`CASE WHEN sb.coach_id is null THEN jo.recruiter_id ELSE sb.coach_id END coach_id`),
    ];
    const query = Database.from('job_orders as jo');

    if (identifier === 'types') {
      query.select([
        ...this.getRawFilterByTypesOrStatus('jo', 'wsh.job_order_type_id', _jobOrderTypes),
        ...select_values,
      ]);
      query.innerJoin('white_sheets as wsh', 'jo.id', 'wsh.job_order_id');
    } else if (identifier === 'status') {
      query.select([...this.getRawFilterByTypesOrStatus('jo', 'jo.status_id', _jobOrderStatus), ...select_values]);
    }

    this.applyJobBaseRelations(query);
    query.joinRaw(
      `left join (select distinct coach_id,recruiter_id from recruiter_has_industries)sb on sb.recruiter_id = jo.recruiter_id`
    );
    this.applyQueryWhereClauseDate(startDate, endDate, query, 'jo');
    this.applyWhereClause(digFilters, query);
    query.groupByRaw('jo.recruiter_id,CASE WHEN sb.coach_id is null THEN jo.recruiter_id ELSE sb.coach_id END');

    return query;
  }

  getRawFilterByTypesOrStatus(tableName, relation, types) {
    return types.map((type) =>
      Database.raw(`COUNT(distinct(${tableName}.id)) filter (where ${relation} = ${type}) as "${type}"`)
    );
  }

  applyJobBaseRelations(query) {
    query
      .leftJoin('addresses as add', 'jo.address_id', 'add.id')
      .leftJoin('cities as cty', 'add.city_id', 'cty.id')
      .leftJoin('states as st', 'cty.state_id', 'st.id')
      .leftJoin('specialties as spec', 'jo.specialty_id', 'spec.id');
  }

  applyCompanyBaseRelations(query) {
    query
      .leftJoin('addresses as add', 'cp.address_id', 'add.id')
      .leftJoin('cities as cty', 'add.city_id', 'cty.id')
      .leftJoin('states as st', 'cty.state_id', 'st.id')
      .leftJoin('specialties as spec', 'cp.specialty_id', 'spec.id');
  }

  applycandidateBaseRelations(query) {
    query
      .leftJoin('personal_informations as pi', 'ca.personal_information_id', 'pi.id')
      .leftJoin('addresses as add', 'pi.address_id', 'add.id')
      .leftJoin('cities as cty', 'add.city_id', 'cty.id')
      .leftJoin('states as st', 'cty.state_id', 'st.id')
      .leftJoin('specialties as spec', 'ca.specialty_id', 'spec.id');
  }

  /**
   * Return the where clause to apply on the query.
   * GET where clause
   *
   * @param {Request} ctx.request
   */
  async applyWhereClause(digFilters, query) {
    const { stateId, specialtyId, industryId } = digFilters;
    const whereClause = {};

    if (specialtyId) {
      whereClause['spec.id'] = specialtyId;
    }

    if (stateId) {
      whereClause['st.id'] = stateId;
    }

    if (industryId) {
      whereClause['spec.industry_id'] = industryId;
    }

    query.where(whereClause);
  }

  /**
   * Return the where clause to apply on the query.
   * GET where clause
   *
   * @param {Request} ctx.request
   */
  async applyWhereClauseCustomTable(digFilters, query, tableName) {
    const { stateId, specialtyId, industryId } = digFilters;
    const whereClause = {};

    if (specialtyId) {
      whereClause[`${tableName}.specialty_id`] = specialtyId;
    }

    if (stateId) {
      whereClause[`${tableName}.state_id`] = stateId;
    }

    if (industryId) {
      whereClause[`${tableName}.industry_id`] = industryId;
    }

    query.where(whereClause);
  }

  async applyQueryWhereClauseDate(startDate, endDate, query, tableName) {
    if (startDate && endDate) {
      query.whereBetween(`${tableName}.created_at`, [startDate, endDate]);
    } else if (startDate) {
      query.where(`${tableName}.created_at`, '>=', startDate);
    } else if (endDate) {
      query.where(`${tableName}.created_at`, '<=', endDate);
    }
  }

  async applyWhereClauseUser(userFilters, query, tableName, tableRelation, isAssigned, isATrendGraph = false) {
    const { coachId, recruiterId, regionalId } = userFilters;
    const userId = coachId || regionalId || null;
    if (!recruiterId && !userId) {
      return null;
    }
    if (userId && !recruiterId) {
      const isACoachFIlter = (coachId && regionalId) || (coachId && !regionalId);
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
    const coachesIds = await RecruiterRepository.coachesByRegion(regionalId);
    const recruitersIds = await RecruiterRepository.recruitersByUser(regionalId, 'regional_director_id');
    const recruiters = merge(coachesIds, recruitersIds);
    const ids = recruiters.map((recruiter) => Number(recruiter.recruiter_id));
    return ids;
  }

  getDates(startDate, endDate, offset) {
    offset *= -1;
    startDate = moment.utc(startDate).utcOffset(offset, false).format('YYYY-MM-DD HH:mm:ss');
    if (
      moment.utc(endDate, 'YYYY-MM-DD HH:mm:ss').utcOffset(offset, false).format('YYYY-MM-DD HH:mm:ss') >
        moment.utc().format('YYYY-MM-DD HH:mm:ss') ||
      !endDate
    ) {
      endDate = moment.utc().format('YYYY-MM-DD HH:mm:ss');
    } else {
      endDate = moment.utc(endDate).utcOffset(offset, false).format('YYYY-MM-DD HH:mm:ss');
    }
    return [startDate, endDate];
  }

  async getUsersWithoutItems(results, userFilters) {
    try {
      const { coachId, recruiterId, regionalId } = userFilters;
      let usersId = null;
      const query = Database.table('users')
        .select(['users.id', 'pi.full_name'])
        .innerJoin('personal_informations as pi', 'users.personal_information_id', 'pi.id');
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
        code: 500,
        message: 'There was a problem retrieving the users list. Please try again later!',
      };
    }
  }
}

module.exports = DashboardRepository;
