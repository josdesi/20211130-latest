'use strict';

// Utils
const appInsights = require('applicationinsights');
const Database = use('Database');
const path = require('path');
const { uploadFile, deleteServerFile,getMultipartConfig } = use('App/Helpers/FileHelper');
const {
  auditFields,
  userFilters,
  JobOrderStatusSchemes,
  hiringAuthorityStatus,
  userRoles,
  AdditionalRecruiterTypes,
  AdditionalRecruiterStatus,
} = use('App/Helpers/Globals');
const { fileType } = use('App/Helpers/FileType');
const { multipleFilterParser, defaultWhereResolver, applyOrderClause, multipleWhereResolver, positionFilterResolver } = (use('App/Helpers/QueryFilteringUtil'));

// Repositories
const RecruiterRepository = new (use('App/Helpers/RecruiterRepository'))();
const UserRepository = new (use('App/Helpers/UserRepository'))();
const whiteSheetRepository = new (use('App/Helpers/WhiteSheetRepository'))();
const JobOrderRepository = new (use('App/Helpers/JobOrderRepository'))();

// Models
const FeeAgreementType = use('App/Models/FeeAgreementType');
const JobOrderType = use('App/Models/JobOrderType');
const JobOrderHasHiringAuthority = use('App/Models/JobOrderHasHiringAuthority');
const JobOrderHasFile = use('App/Models/JobOrderHasFile');
const JobOrderStatus = use('App/Models/JobOrderStatus');
const JobOrder = use('App/Models/JobOrder');
const HiringAuthority = use('App/Models/HiringAuthority');


/** @typedef {import('@adonisjs/framework/src/Request')} Request */
/** @typedef {import('@adonisjs/framework/src/Response')} Response */
/** @typedef {import('@adonisjs/framework/src/View')} View */

/**
 * Resourceful controller for interacting with joborders
 */
class JobOrderController {
  constructor() {
    this._filterOptionsColumnMap = {
      industryId: { column: 'spec.industry_id', resolver: defaultWhereResolver},
      stateId: { column: 'cities.state_id', resolver: defaultWhereResolver},
      cityId: { column: 'cities.id', resolver: defaultWhereResolver},
      zip: { column: 'addresses.zip', resolver: defaultWhereResolver},
      positionId: { column: 'positions.id', resolver: defaultWhereResolver},
      keyword: {resolver: this.keyWordResolver},
      userFilter: {resolver: this.userFilterResolver.bind(this)},
      specialtyId: {column: 'spec.id', resolver: defaultWhereResolver},
      recruiterId: {resolver: this.recruiterResolver.bind(this)},
      subspecialtyId: { column: 'jo.subspecialty_id', resolver: defaultWhereResolver},
      typeId: {column: 'wsht.job_order_type_id', resolver: defaultWhereResolver},
      coachId: {resolver: this.coachResolver.bind(this)},
      statusId: {column: 'jo.status_id', resolver: this.statusWhereResolver},

      industryIds: { column: 'spec.industry_id', resolver: multipleWhereResolver, parser: multipleFilterParser},
      stateIds: { column: 'cities.state_id', resolver: multipleWhereResolver, parser: multipleFilterParser},
      cityIds: { column: 'cities.id', resolver: multipleWhereResolver, parser: multipleFilterParser},
      countryIds: { column: 'cities.country_id', resolver: multipleWhereResolver, parser: multipleFilterParser},
      zips: { column: 'addresses.zip', resolver: multipleWhereResolver, parser: multipleFilterParser},
      positionIds: { column: 'positions.id', resolver: positionFilterResolver, parser: multipleFilterParser},
      specialtyIds: {column: 'spec.id', resolver: multipleWhereResolver, parser: multipleFilterParser},
      recruiterIds: {resolver: this.multipleRecruiterResolver.bind(this), parser: multipleFilterParser},
      subspecialtyIds: { column: 'jo.subspecialty_id', resolver: multipleWhereResolver, parser: multipleFilterParser},
      typeIds: {column: 'wsht.job_order_type_id', resolver: multipleWhereResolver, parser: multipleFilterParser},
      coachIds: {resolver: this.multipleCoachResolver.bind(this), parser: multipleFilterParser},
      statusIds: {resolver: this.statusesWhereResolver, column: 'jo.status_id', parser: multipleFilterParser},
    };
    this._orderColumnsMap = {
      id: 'jo.id',
      title: 'jo.title',
      company_title: 'companies.name',
      specialty_title: 'specialty_title',
      functional_title: 'positions.title',
      city_id: 'cities.id',
      city_name: 'cities.title',
      state_name: 'cities.state',
      state_id: 'cities.state_id',
      created_at: 'jo.created_at',
      minimum_compensation: 'wsht.minimum_compensation',
      good_compensation: 'wsht.good_compensation',
      maximum_compensation: 'wsht.maximum_compensation',
      location: 'location',
      compensation_range: 'compensation_range',
      recruiter: 'recruiter',
      last_activity_date: 'last_activity_date',
      type: 'jotype.title',
      status: 'jos.title'
    };
  }

  statusWhereResolver({ query, column, value, operator = '=' }) {
    query.where(column, operator, value);

    if (value != JobOrderStatusSchemes.Inactive) {
      query.where('jo.status_id', '!=', JobOrderStatusSchemes.Inactive);
    }
  }

  statusesWhereResolver({ query, column, value }) {
    query.whereIn(column, value);

    if (!value.includes(JobOrderStatusSchemes.Inactive)) {
      query.where('jo.status_id', '!=', JobOrderStatusSchemes.Inactive);
    }
  }

  async coachResolver({query, value}) {
    const self = this;
    const coachId = value;
    const recruitersOnCoachTeam = await RecruiterRepository.recruitersByUser(coachId, 'coach_id');
    recruitersOnCoachTeam.push({recruiter_id:Number(coachId)})
    const whereInClauseRecruiters = recruitersOnCoachTeam.map((recruiter) => recruiter.recruiter_id);
    query.where(function () {
      this.whereIn(`jo.created_by`, whereInClauseRecruiters)
          .orWhereIn(`jo.recruiter_id`,whereInClauseRecruiters)
          .orWhere(self.getMultipleRecruitersClause(whereInClauseRecruiters,AdditionalRecruiterTypes.Accountable));
    });
  }

  async multipleCoachResolver({query, value}) {
    const self = this;
    const coachIds = value;
    const recruitersOnCoachTeam = await RecruiterRepository.recruitersByUsers(coachIds, 'coach_id');
    recruitersOnCoachTeam.push(...coachIds.map(coachId => ({recruiter_id: Number(coachId)})));
    const whereInClauseRecruiters = recruitersOnCoachTeam.map((recruiter) => recruiter.recruiter_id);
    query.where(function () {
      this.whereIn(`jo.created_by`, whereInClauseRecruiters)
          .orWhereIn(`jo.recruiter_id`,whereInClauseRecruiters)
          .orWhere(self.getMultipleRecruitersClause(whereInClauseRecruiters,AdditionalRecruiterTypes.Accountable));
    });
  }

  recruiterResolver({query, value}) {
    const self = this;
    query.where(function () {
      this.where('rec.id', value)
      .orWhere(self.getMultipleRecruitersClause([value],AdditionalRecruiterTypes.Accountable))
    })
  }

  multipleRecruiterResolver({query, value}) {
    const self = this;
    query.where(function () {
      this.whereIn('rec.id', value)
      .orWhere(self.getMultipleRecruitersClause([...value],AdditionalRecruiterTypes.Accountable))
    })
  }

  async userFilterResolver({query, value, user_id}) {
    const userFilter = Number(value);
    let self = this;
    if (Number.isNaN(userFilter)) return;
    switch (Number(userFilter)) {
      case userFilters.Mine:  
        query.where(function () {
          this.where('jo.recruiter_id', user_id)
          .orWhere(self.getMultipleRecruitersClause([user_id], AdditionalRecruiterTypes.Accountable))
        });
        break;
      case userFilters.MyIndustries:
        await RecruiterRepository.applyDigFilters(user_id, query, 'spec.industry_id', 'cities.state_id', false);
        break;
      case userFilters.MyTeam:
        const recruitersOnMyTeam = await RecruiterRepository.recruiterOnTeam(user_id);
        query.where(function () {
          this.whereIn(`jo.created_by`, recruitersOnMyTeam)
              .orWhereIn(`jo.recruiter_id`,recruitersOnMyTeam)
              .orWhere(self.getMultipleRecruitersClause(recruitersOnMyTeam,AdditionalRecruiterTypes.Accountable))
        });
        break;
      case userFilters.MyCollaborations:
        query.where(this.getMultipleRecruitersClause([user_id], AdditionalRecruiterTypes.Collaborator));
        break;
      case userFilters.FreeGame:
        query.where('jo.free_game', true);
        break;
    }
  }

  keyWordResolver({query, value}) {
    query.where(function () {
      this.where('jo.title', 'ilike', `%${value}%`)
        .orWhere('positions.title', 'ilike', `%${value}%`)
        .orWhere('companies.name', 'ilike', `%${value}%`);
    })
  }

  /**
   * Show a list of all joborders.
   * GET joborders
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   * @param {View} ctx.view
   */
  async index({ auth, request, response }) {
    try {
      const user_id = auth.current.user.id;

      const jobOrders = await this.listingQuery(request.all(), user_id);

      return response.ok(jobOrders);
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      return response.status(500).send({
        message: 'There was a problem retrieving the job orders',
      });
    }
  }

  /**
   * The logic behind the index was modularized here, while I wanted to put this in the repository, it seems that that applywhereclause is 
   *  deeply rooted to be here, in the controller, and fixing it will take time
   * GET candidates
   *
   * @method joborders
   *
   * @param {object} queryParams - Contains everything passed as query params from the get requestes
   * @param {number} user_id
   *
   * @return {Object} A pagination object
   */
  async listingQuery(queryParams, user_id){
    const { page = 1, perPage = 10, orderBy, direction } = queryParams;
    const query = Database.table('job_orders as jo');
    query
      .select([
        'jo.id',
        'jo.title',
        'companies.name  as company_title',
        Database.raw(
          `(CASE WHEN sub.title IS NOT NULL THEN CONCAT(spec.title, ': ', sub.title)
                ELSE spec.title END) AS specialty_title`),
        'positions.title as functional_title',
        'cities.id as city_id',
        'cities.title as city_name',
        'cities.state as state_name',
        'cities.state_id as state_id',
        'jo.created_at',
        'wsht.minimum_compensation',
        'wsht.good_compensation',
        'wsht.maximum_compensation',
        Database.raw("(select concat(cities.title,', ',cities.state_slug)) as location"), 
        Database.raw("(select array[wsht.minimum_compensation ,wsht.good_compensation ,wsht.maximum_compensation]) as compensation_range"),
        'wsht.minimum_compensation',
        'wsht.good_compensation',
        'wsht.maximum_compensation',
        'rec.user_name as recruiter',
        'coach.user_name as coach',
        Database.raw(`json_build_object('id', jos.id, 'title', jos.title, 'color', jos.style) as status`),
        Database.raw(`json_build_object('id', jotype.id, 'title', jotype.title, 'color', jotype.style_class_name, 'type', jotype.title, 'type_class_name', jotype.style_class_name) as type`),        
        'jo.last_activity_date',
        'spec.industry as industry',
        'spec.title as specialty',
        'sub.title as subspecialty'
      ])
      .innerJoin('companies', 'jo.company_id', 'companies.id')
      .innerJoin('v_specialties as spec', 'jo.specialty_id', 'spec.id')
      .leftJoin('subspecialties as sub', 'sub.id', 'jo.subspecialty_id')
      .innerJoin('positions', 'jo.position_id', 'positions.id')
      .leftJoin('addresses', 'jo.address_id', 'addresses.id')
      .leftJoin('v_cities as cities', 'addresses.city_id', 'cities.id')
      .leftJoin('v_users as rec', 'jo.recruiter_id', 'rec.id')
      .leftJoin('v_users as coach', 'rec.coach_id', 'coach.id')
      .leftJoin('white_sheets as wsht', 'jo.id', 'wsht.job_order_id')
      .innerJoin('job_order_statuses as jos', 'jo.status_id', 'jos.id')
      .leftJoin('job_order_types as jotype', 'jotype.id', 'wsht.job_order_type_id');

    await this.applyWhereClause(queryParams, query, user_id);
    applyOrderClause({direction, column: orderBy, query, columnsMap: this._orderColumnsMap});
    const jobOrders = await query.paginate(page, perPage);

    return jobOrders
  }

  /**
   * Get a basic where clause based on receive parametes
   * @param {object} queryParams - Contains everything passed as query params from the get requestes
   * @param {Object} query - The query used in the indexing
   */

  async applyWhereClause(queryParams, query, user_id) {
    const filters = {
      'industryId': queryParams.industryId,
      'stateId': queryParams.stateId,
      'cityId': queryParams.cityId,
      'zip': queryParams.zip,
      'keyword': queryParams.keyword,
      'userFilter': queryParams.userFilter,
      'positionId': queryParams.positionId,
      'specialtyId': queryParams.specialtyId,
      'recruiterId': queryParams.recruiterId,
      'subspecialtyId': queryParams.subspecialtyId,
      'typeId': queryParams.typeId,
      'coachId': queryParams.coachId,
      'statusId': queryParams.statusId,

      'industryIds': queryParams.industryIds,
      'stateIds': queryParams.stateIds,
      'cityIds': queryParams.cityIds,
      'zips': queryParams.zips,
      'positionIds': queryParams.positionIds,
      'specialtyIds': queryParams.specialtyIds,
      'recruiterIds': queryParams.recruiterIds,
      'subspecialtyIds': queryParams.subspecialtyIds,
      'typeIds': queryParams.typeIds,
      'coachIds': queryParams.coachIds,
      'countryIds': queryParams.countryIds,
      'statusIds': queryParams.statusIds,
    };

    const filtersToEvaluate = Object.keys(filters);
    for(const keyFilter of filtersToEvaluate) {
      const filterMapEntry = this._filterOptionsColumnMap[keyFilter];
      if (!filterMapEntry) continue;
      const {resolver, column, parser} = filterMapEntry;
      const value = (parser instanceof Function) ? parser(filters[keyFilter]) : filters[keyFilter];
      if (!value || !(resolver instanceof Function)) continue;
      await resolver({query, column, value, user_id});
    }
  }

  getMultipleRecruitersClause(recruiters, type) {
    return Database.raw(
      'ARRAY[' +
        recruiters.map((_) => '?').join(',') +
        ']::int[] && (SELECT array_agg(recruiter_id) from job_order_additional_recruiters where job_order_id = jo.id and status = ? ' +
        (type ? `and type = '${type}')` : ')'),
      [...recruiters,AdditionalRecruiterStatus.Approved]
    );
  }

  /**
   * Create/save a new joborder.
   * POST joborders
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async store({ auth, request, response }) {
    const result = await JobOrderRepository.create(request.all(), auth.current.user.id);

    return response.status(result.code).send(result);
  }

  /**
   * Display a single joborder.
   * GET joborders/:id
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   * @param {View} ctx.view
   */
  async show({ params, request, response }) {
    try {
      const mode = request.input('mode') || 'all';
      const jobOrder = await JobOrderRepository.details(params.id, mode)
      
      if (!jobOrder) {
        return response.status(404).send({
          message: 'The Job Order was not found',
        });
      }

      return response.status(200).send(jobOrder);
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
      return response.status(500).send({
        message: 'There was a problem retrieving the jobOrder, please try again later',
      });
    }
  }

  /**
   * Update joborder details.
   * PUT or PATCH joborders/:id
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async update({ auth, params, request, response }) {
    const result = await JobOrderRepository.update(params, request.all(), auth.current.user.id);
    if (result.success && result.data) {
      return response.status(result.code).send(result.data);
    }
    return response.status(result.code).send(result);
  }

  /**
   * Delete a joborder with id.
   * DELETE joborders/:id
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async destroy({ params, request, response }) {}

  /**
   * Show a list of all jobOrderStatus.
   * GET job_order_status
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   * @param {View} ctx.view
   */
  async statuses({ request, response }) {
    const { selectable: selectableFilter } = request.only(['selectable']);

    const query = JobOrderStatus.query().setHidden(auditFields);

    if (selectableFilter) {
      query.where('selectable', selectableFilter);
    }

    const statuses = await query.orderBy('title').fetch();

    return response.ok(statuses);
  }

  /**
   * Create/save a new jobOrder note.
   * POST job-orders/:id/notes
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async storeNote({ auth, request, response, params }) {
    const result = await JobOrderRepository.createNote(request.all(), params.id, auth.current.user.id);
    return response.status(result.code).send(result);
  }

  /**
   * Update a  jobOrder  note.
   * POST job-orders/:jobOrderId/notes/:id
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async updateNote({ auth, request, response, params }) {
    const result = await JobOrderRepository.updateNote(
      request.all(),
      params.id,
      params.jobOrderId,
      auth.current.user.id
    );
    if (result.success && result.data) {
      return response.status(result.code).send(result.data);
    }
    return response.status(result.code).send(result);
  }

  /**
   * Destroy a jobOrder note.
   * Delete job-orders/:jobOrderId/notes/:id
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async destroyNote({ auth, response, params }) {
    const result = await JobOrderRepository.deleteNote(params.id, params.jobOrderId, auth.current.user.id);

    return response.status(result.code).send(result);
  }

  /**
   * Create/save a new jobOrder activity log.
   * POST job-orders/:id/activityLogs
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async storeActivityLog({ auth, request, response, params }) {
    const { body, activity_log_type_id } = request.only(['body', 'activity_log_type_id']);

    const result = await JobOrderRepository.createActivityLog(
      body,
      activity_log_type_id,
      params.id,
      auth.current.user.id
    );

    return response.status(result.code).send(result);
  }

  /**
   * Update a  jobOrder activity log.
   * POST job-orders/:jobOrderId/activityLogs/:id
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async updateActivityLog({ auth, request, response, params }) {
    const result = await JobOrderRepository.updateActivityLog(
      request.all(),
      params.id,
      params.jobOrderId,
      auth.current.user.id
    );

    if (result.success && result.data) {
      return response.status(result.code).send(result.data);
    }
    return response.status(result.code).send(result);
  }

  /**
   * Destroy a JobOrder activity log.
   * Delete job-orders/:jobOrderId/activityLogs/:id
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async destroyActivityLog({ auth, response, params }) {
    const result = await JobOrderRepository.deleteActivityLog(params.id, params.jobOrderId, auth.current.user.id);

    return response.status(result.code).send(result);
  }

  /**
   * Upload File.
   * POST job-orders/files/
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async storeFile({ auth, request, params, response }) {
    const jobOrder = await JobOrder.find(params.id);
    const user_id = auth.current.user.id;
    if (!jobOrder) {
      return response.send({
        success: false,
        code: 404,
        message: { error: 'JobOrder not Found' },
      });
    }
    try {
      request.multipart.file('file', getMultipartConfig(), async (file) => {
        await file.runValidations();
        const error = file.error();
        if (error.message) {
          return response.status(400).send({
            message: { error: error.message },
          });
        }
        const originalName = path.parse(file.clientName).name;
        const fileName = `${originalName}-${new Date().getTime()}.${file.extname}`;
        const absolutePath = await uploadFile('attachments/' + fileName, file.stream);
        if (!absolutePath) {
          return response.status(500).send({
            message: 'There was a problem uploading the file , pleae try again later!',
          });
        }
        const jobOrderFile = await JobOrderHasFile.create({
          job_order_id: jobOrder.id,
          file_type_id: await fileType('ATTACHMENT'),
          url: absolutePath,
          file_name: `${originalName}.${file.extname}`,
        });

        await jobOrder.merge({ updated_by: user_id });
        await jobOrder.save();

        return response.status(201).send(jobOrderFile);
      });
      await request.multipart.process();
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      return response.status(500).send({
        message: 'There was a problem uploading the file, please try again later',
      });
    }
  }

  /**
   * DELETE file
   *
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async deleteFile({ auth, params, response }) {
    try {
      const user_id = auth.current.user.id;
      const jobOrder = await JobOrder.find(params.id);
      const jobOrderFile = await JobOrderHasFile.query()
        .where('id', params.fileId)
        .where('job_order_id', params.id)
        .first();
      if (!jobOrderFile) {
        return response.status(404).send({
          message: 'File not found',
        });
      }
      await deleteServerFile(jobOrderFile.url);
      await jobOrderFile.delete();
      await jobOrder.merge({ updated_by: user_id });
      await jobOrder.save();

      return response.status(200).send({
        message: 'The file was deleted succesfully!',
      });
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
      return response.status(500).send({
        message: 'There was a problem deleting the file, please try again later',
      });
    }
  }

  /**
   * Update whitesheet .
   * PUT or PATCH job-orders/:id/whiteSheets/:whiteSheetId
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async updateWhiteSheet({ auth, request, response, params }) {
    const result = await whiteSheetRepository.update(
      request.all(),
      params.id,
      params.whiteSheetId,
      auth.current.user.id
    );

    if (result.success && result.data) {
      return response.status(result.code).send(result.data);
    }

    return response.status(result.code).send(result);
  }

  /**
   * Show a list of all feeTypes.
   * GET feeTypes
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   * @param {View} ctx.view
   */
  async feeTypes({ response }) {
    try {
      const feeTypes = await FeeAgreementType.query().setHidden(auditFields).orderBy('title').fetch();

      return response.ok(feeTypes);
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      return response.status(500).send({
        message: 'There was a problem getting the feeTypes, please try again later',
      });
    }
  }

  /**
   * Show a list of all jobOrderTypes.
   * GET jobOrderTypes
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   * @param {View} ctx.view
   */
  async jobOrderTypes({ response }) {
    try {
      const jobOrderTypes = await JobOrderType.query().where('available', 1).setHidden(auditFields).orderBy('id').fetch();

      return response.ok(jobOrderTypes);
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      return response.status(500).send({
        message: 'There was a problem getting the jobOrderTypes, please try again later',
      });
    }
  }

  async addHiringAuthority({request, params, response}){
    const result = await JobOrderRepository.assignOrCreateHiringAuthority(request,params.id);

    return response.status(result.code).send( result.success ? result.data : result )
  }

  async createAndAssignHiringAuthority({request, params, response}) {
    const jobOrderId = params.id;
    const hiringAuthorityData = request.only(
      [
        'first_name',
        'last_name',
        'title',
        'personal_email',
        'work_email',
        'personal_phone',
        'work_phone',
        'ext',
        'specialty_id',
        'subspecialty_id',
        'position_id'
      ]);
    const result = await JobOrderRepository.createAndAssignHiringAuthority(jobOrderId, hiringAuthorityData);
    return response.status(result.code).send( result.success ? result.data : result);
  }

  async updateAndAssignHiringAuthority({request, params, response}) {
    const jobOrderId = params.id;
    const hiringAuthorityId = params.hiringAuthorityId;
    const hiringAuthorityData = request.only(
      [
        'specialty_id',
        'subspecialty_id',
        'position_id'
      ]);
    const result = await JobOrderRepository.updateAndAssignHiringAuthority(jobOrderId, hiringAuthorityId, hiringAuthorityData);
    return response.status(result.code).send( result.success ? result.data : result);
  }

  async deleteHiringAuthority({ params, response}) {
    try {
      const transaction = await Database.beginTransaction();
      const {id, hiring_authority_id} = params;
      await JobOrderHasHiringAuthority
        .query()
        .where('job_order_id', id)
        .where('hiring_authority_id', hiring_authority_id)
        .transacting(transaction)
        .delete()
      await HiringAuthority
        .query()
        .where('id', hiring_authority_id)
        .whereNotExists(function() {
          this
            .from('job_order_has_hiring_authorities').select('*')
            .whereRaw('hiring_authority_id = hiring_authorities.id')
        })
        .transacting(transaction)
        .update({hiring_authority_status_id: hiringAuthorityStatus.Inactive})
      
      transaction.commit();
      return response.status(204).send({});
    } catch(error) {
      transaction.rollback();
      appInsights.defaultClient.trackException({ exception: error });
      return response.status(500).send({
        message: 'There was a problem deleting hiring authority from joborder.',
      });
    }
  }

  async assignRecruiter({params, request, auth, response}) {
    const jobOrderId = params.id;
    const recruiterId = request.input('recruiterId');
    const result = await JobOrderRepository.assignToRecruiter(jobOrderId, recruiterId, auth.current.user.id);
    return response.status(result.code).send(result.success ? result.data : result);
  }

  async getAvailableHiringAuthoritiesAssingTo({params, response}) {
    const job_order_id = params.id;
    const result =  await JobOrderRepository.getAvailableHiringAuthoritiesAssingTo(job_order_id);
    return response.status(result.code).send(result.success ? result.data : result);
  }

  async candidatesToAssign({params, response}){
    try {
      const result =  await JobOrderRepository.candidatesToAssign(params.id);
      return response.status(result.code).send(result.data || result);
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      return response.status(500).send({
        message: 'There was a problem getting the candidates, please try again later',
      });
    }
  }

  async assignCandidate({params,request, response}){
    try {
      const { candidateId } = request.all();
      const result = await JobOrderRepository.assignCandidate(candidateId,params.id);
      return response.status(result.code).send(result.data || result);
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      return response.status(500).send({
        message: 'There was a problem assigning the Candidate, please try again later',
      });
    }
  }

  async removeCandidate({params,request, response}){
    try {
      const result = await JobOrderRepository.removeCandidate(params.candidateId,params.id);
      return response.status(result.code).send(result);
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      return response.status(500).send({
        message: 'There was a problem removing the Candidate, please try again later',
      });
    }
  }
  
  async getAssignmentHistory({params, response}) {
    const jobOrderId = params.id;
    const result = await JobOrderRepository.getAssignationHistory(jobOrderId);
    return response.status(result.code).send(result.data);
  }


    /**
   * @deprecated  
   * 
   * Get all the job order metrics for an user
   * GET orders/metricsByUser
   *
   * @method metricsByUser
   *
   * @param {Authentication} ctx.auth
   * @param {Response} ctx.response
   *
   * @return {Object} JobOrderMetrics data or an error code
   */
  async metricsByUser({ auth, response, request }) {
    const userId = auth.current.user.id;
    const recruiterId = request.input('recruiterId');
    const isCoach = await UserRepository.hasRole(userId,userRoles.Coach)
    const result = await JobOrderRepository.getMetricsByUser(isCoach ? (recruiterId  || userId) : userId);
    return response.status(result.code).send(result.data);
  }

    /**
   * @deprecated  
   * 
   * Get all the metrics for a job order
   *
   * @method getOperatingMetrics
   *
   * @param {object} ctx
   * @param {Response} ctx.response
   *
   * @return {Object} Message or success or an error code
   */
  async operatingMetrics({ params, response }){
    const result = await JobOrderRepository.getOperatingMetrics(params.id);
    return response.status(result.code).send(result.data || result);
  }

  
  /**
   * POST
   * Request a new recruiter for a job order
   *
   * @method requestAdditionalRecruiter
   *
   * @param {object} ctx
   * @param {Response} ctx.response
   *
   * @return {Object} Message or success or an error code
   */
  async requestAdditionalRecruiter({ auth, params, request, response }) {
    const  requestData  = request.only(['notes', 'type', 'target_recruiter_id','recruiter_to_collaborate_id']);
    const result = await JobOrderRepository.createAdditionalRecruiterRequest(params.id, requestData, auth.current.user);
    return response.status(result.code).send(result.data || result);
  }

  /**
   * Returns the info of the additional recruiter fo a job order
   *
   * @method additionalRecruitersInfo
   * 
   * @param {object} ctx.
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   *
   * 
   * @return {Object} Message or success or an error code
   */
  async additionalRecruitersInfo({ params, request, response }) {
    const status = request.input('status');
    const result = await JobOrderRepository.getAdditionalRecruitersInfo(params.id,status || AdditionalRecruiterStatus.Approved);
    return response.status(result.code).send(result.data || result);
  }
  /**
   * Updates an additional recruiter
   *
   * @method updateAdditionalRecruiter
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   *
   *
   * @return {Object} Message or success or an error code
   */
  async updateAdditionalRecruiter({ auth, request, params, response }) {
    const { requestId, id: jobOrderId } = params;
    const payload = request.only(['target_recruiter_id', 'recruiter_to_collaborate_id']);
    
    const result = await JobOrderRepository.updateAdditionalRecruiter(
      requestId,
      jobOrderId,
      payload,
      auth.current.user.id
    );

    return response.status(result.code).send(result);  
  }
  /**
   * Delete an additional recruiter
   * Each record on JObOrderAdditionalRecruiter represents a request to add another recruiter
   *
   * @method deleteAdditionalRecruiter
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   *
   * @return {Object} Message or success or an error code
   */
  async deleteAdditionalRecruiter({ auth, params, response }) {
    const { requestId, id: jobOrderId } = params;
    const loggedUserId = auth.current.user.id;

    const result = await JobOrderRepository.deleteAdditionalRecruiter(requestId, jobOrderId, loggedUserId);

    return response.status(result.code).send(result);
  }  

    /**
   * Returns the list of placemnents for a job order
   *
   * @method placements
   * 
   * @param {object} ctx.
   * @param {Response} ctx.response
   *
   * 
   * @return {Object} Message or success or an error code
   */
    async placements({ params, response }) {
      const result = await JobOrderRepository.placements(params.id);
      return response.status(result.code).send(result.data || result);
    }
}

module.exports = JobOrderController;
