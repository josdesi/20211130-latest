'use strict';

//Utils
const { multipleFilterParser, defaultWhereResolver, multipleWhereResolver } = use('App/Helpers/QueryFilteringUtil');
const { userFilters, parseDateWithOffset } = use('App/Helpers/Globals');
const Database = use('Database');

//Repositories
const RecruiterRepository = new (use('App/Helpers/RecruiterRepository'))();


const dateParams = [
  'start_created_at_date',
  'end_created_at_date',
  'start_invoice_date',
  'end_invoice_date',
  'start_approved_date',
  'end_approved_date',
  'start_summary_date',
  'end_summary_date',
  'start_fall_off_date',
  'end_fall_off_date'
];

const orderColumnsMap = {
  start_date: 'plt.start_date',
  fee_amount: 'plt.fee_amount',
  candidate: 'pic.full_name',
  company: 'cp.name',
  status: 'plt.id',
  invoiced_date: 'plt.last_invoice_date',
  created_at: 'plt.created_at',
  coach: 'user_info.coach_name',
  regional: 'user_info.regional_full_name',
  specialty: 'spec.title',
  industry: 'spec.industry',
  subspecialty: 'sub.title',
  approved_date: 'plt.approved_date',
  fall_off_date: 'plt.fall_off_date',
};


class PlacementListBuilder {
  constructor(){
    this._filterOptionsColumnMap = this.getFilterOptionsMap();
    this._orderColumnsMap = orderColumnsMap;
  }

  getFilterOptionsMap = () => {
    const bindedDefaultWhereResolver = defaultWhereResolver.bind(this);
    const bindedDefaultMultipleWhereResolver = (column) => ({
      resolver: multipleWhereResolver.bind(this),
      column,
      parser: multipleFilterParser,
    });
    return {
      statusIds: bindedDefaultMultipleWhereResolver('plts.id'),
      candidateIds: bindedDefaultMultipleWhereResolver('ca.id'),
      companyIds: bindedDefaultMultipleWhereResolver('cp.id'),
      recruiterIds: {
        resolver: this.applyMultipleRecruiterFilterResolver.bind(this),
        parser: multipleFilterParser,
      },
      coachIds: {
        resolver: this.applyMultipleCoachFilterResolver.bind(this),
        parser: multipleFilterParser,
      },
      regionalDirectorIds: {
        resolver: this.applyMultipleRegionalFilterResolver.bind(this),
        parser: multipleFilterParser,
      },
      start_created_at_date: {
        resolver: bindedDefaultWhereResolver,
        column: 'plt.created_at',
        operator: '>=',
      },
      end_created_at_date: {
        resolver: bindedDefaultWhereResolver,
        column: 'plt.created_at',
        operator: '<=',
      },
      start_invoice_date: {
        resolver: bindedDefaultWhereResolver,
        column: 'plt.last_invoice_date',
        operator: '>=',
      },
      end_invoice_date: {
        resolver: bindedDefaultWhereResolver,
        column: 'plt.last_invoice_date',
        operator: '<=',
      },
      start_approved_date: {
        resolver: bindedDefaultWhereResolver,
        column: 'plt.approved_date',
        operator: '>=',
      },
      end_approved_date: {
        resolver: bindedDefaultWhereResolver,
        column: 'plt.approved_date',
        operator: '<=',
      },
      start_fall_off_date: {
        resolver: this.applyDateFallOffFilterResolver.bind(this),
        column: 'plt.fall_off_date',
        operator: '>=',
      },
      end_fall_off_date: {
        resolver: this.applyDateFallOffFilterResolver.bind(this),
        column: 'plt.fall_off_date',
        operator: '<=',
      },
      start_summary_date: {
        resolver: this.applyDateSummaryFilterResolver.bind(this),
        column: 'start_summary_date',
        operator: '>=',
      },
      end_summary_date: {
        resolver: this.applyDateSummaryFilterResolver.bind(this),
        column: 'end_summary_date',
        operator: '<=',
      },
      userFilter: {
        resolver: this.applyUserFilterResolver.bind(this),
      },
      industryIds: bindedDefaultMultipleWhereResolver('spec.industry_id'),
      specialtyIds: bindedDefaultMultipleWhereResolver('jo.specialty_id'),
      subspecialtyIds: bindedDefaultMultipleWhereResolver('jo.subspecialty_id'),
    };
  };


  async applyWhereClause(filters = {}, user_id, timezone) {
    dateParams.forEach((field) => {
      filters[field] = parseDateWithOffset(filters[field], timezone);
    })
    for (const keyFilter of Object.keys(this._filterOptionsColumnMap)) {
      const filterMapEntry = this._filterOptionsColumnMap[keyFilter];
      if (!filterMapEntry) continue;
      const { resolver, column, parser, operator } = filterMapEntry;
      const value = parser instanceof Function ? parser(filters[keyFilter]) : filters[keyFilter];
      if (!value || !(resolver instanceof Function)) continue;
      await resolver({ query: this.query, column, value, user_id, operator });
    }
  }

  applyKeywordClause(keyword) {
    if (keyword) {
      this.query.where(function () {
        this.where('cp.name', 'ilike', `%${keyword}%`).orWhere('pic.full_name', 'ilike', `%${keyword}%`);
      });
    }
  }

  applyOrderClause(direction = 'asc', orderBy = 'start_date') {
    const validDirections = ['asc', 'desc'];
    const orderColumn = this._orderColumnsMap[orderBy];
    const orderDirection =
      validDirections.find((dir) => dir.toLowerCase() === direction.toLowerCase()) || validDirections[0];
    this.query.orderByRaw(`${orderColumn} ${orderDirection} NULLS LAST`);
  }

  async applyUserFilterResolver({ query, user_id, value }) {
    switch (Number(value)) {
      case userFilters.Mine:
        query.whereExists(function (){
          this.select('user_id').from('placement_splits').whereRaw('placement_id = plt.id AND user_id = :userId',{ userId: user_id });
        })
        break;
      case userFilters.MyTeam:
        const recruitersOnMyTeam = await RecruiterRepository.recruiterOnTeam(user_id);
        query.whereExists(function (){
          this.select('user_id').from('placement_splits').whereRaw('placement_id = plt.id').whereIn('user_id',recruitersOnMyTeam);
        })
        break;
      default:
        break;
    }
  }

  async applyDateSummaryFilterResolver({ query, value, operator }) {
    query.whereRaw(
      `(
        (plt.created_at ${operator} :value AND plt.created_at IS NOT null) OR
        (plt.last_invoice_date ${operator} :value AND plt.last_invoice_date IS NOT null) OR
        (plt.approved_date ${operator} :value AND plt.approved_date IS NOT null) OR
        (plt.fall_off_date ${operator} :value AND plt.fall_off_date IS NOT null) OR
        (plt.fall_off_request_date ${operator} :value AND plt.fall_off_request_date IS NOT null) OR
        (plt.fall_off_revert_request_date ${operator} :value AND plt.fall_off_revert_request_date IS NOT null) 
       )
      `
    ,{
      value
    });
  }

  async applyDateFallOffFilterResolver({ query, value, operator }) {
    query.whereRaw(
      `(
        (plt.fall_off_date ${operator} :value AND plt.fall_off_date IS NOT null) OR
        (plt.fall_off_request_date ${operator} :value AND plt.fall_off_request_date IS NOT null) OR
        (plt.fall_off_revert_request_date ${operator} :value AND plt.fall_off_revert_request_date IS NOT null) 
       )
      `
    ,{
      value
    });
  }

  async applyMultipleRecruiterFilterResolver({query, value}) {
    const recruiterIds = value;
    query.whereExists(function (){
      this.select('user_id').from('placement_splits').whereRaw('placement_id = plt.id').whereIn('user_id',recruiterIds);
    })
  }

  async applyMultipleCoachFilterResolver({query, value}) {
    const coachIds = value;
    const recruitersOnCoachTeam = await RecruiterRepository.recruitersByUsers(coachIds, 'coach_id');
    recruitersOnCoachTeam.push(...coachIds.map(coachId => ({recruiter_id:Number(coachId)})))
    const whereInClauseRecruiters = recruitersOnCoachTeam.map((recruiter) => recruiter.recruiter_id);
    query.whereExists(function (){
      this.select('user_id').from('placement_splits').whereRaw('placement_id = plt.id').whereIn('user_id',whereInClauseRecruiters);
    })
  }

  async applyMultipleRegionalFilterResolver({query, value}) {
    const regionalIds = value;
    const recruitersOnRegionalTeam = await RecruiterRepository.recruitersByUsers(regionalIds, 'regional_director_id');
    recruitersOnRegionalTeam.push(...regionalIds.map(regionalId => ({recruiter_id:Number(regionalId)})))
    const whereInClauseRecruiters = recruitersOnRegionalTeam.map((recruiter) => recruiter.recruiter_id);
    query.whereExists(function (){
      this.select('user_id').from('placement_splits').whereRaw('placement_id = plt.id').whereIn('user_id',whereInClauseRecruiters);
    })
  }


  buildBaseListQuery(columnsToSelect = []) {
    this.query = Database.table('placements as plt')
      .select(columnsToSelect)
      .innerJoin('sendouts as so', 'plt.sendout_id', 'so.id')
      .innerJoin('candidates as ca', 'so.candidate_id', 'ca.id')
      .innerJoin('personal_informations as pic', 'ca.personal_information_id', 'pic.id')
      .innerJoin('job_orders as jo', 'so.job_order_id', 'jo.id')
      .innerJoin('companies as cp', 'jo.company_id', 'cp.id')
      .innerJoin('placement_statuses as plts', 'plt.placement_status_id', 'plts.id')
      .leftJoin('v_users as user_info','plt.created_by','user_info.id')
      .innerJoin('v_specialties as spec', 'jo.specialty_id', 'spec.id')
      .leftJoin('subspecialties as sub', 'sub.id', 'cp.subspecialty_id');
  }

}

module.exports = PlacementListBuilder;
