'use strict';

/** @typedef {import('@adonisjs/framework/src/Request')} Request */
/** @typedef {import('@adonisjs/framework/src/Response')} Response */
/** @typedef {import('@adonisjs/framework/src/View')} View */

// Utils
const appInsights = require('applicationinsights');
const Database = use('Database');
const path = require('path');
const { uploadFile, getMultipartConfig } = use('App/Helpers/FileHelper');
const { auditFields, userFilters, CandidateStatusSchemes, userRoles, AdditionalRecruiterTypes, AdditionalRecruiterStatus } = use('App/Helpers/Globals');
const { fileType } = use('App/Helpers/FileType');
const { multipleFilterParser, defaultWhereResolver, multipleWhereResolver, positionFilterResolver, applyOrderClause } = (use('App/Helpers/QueryFilteringUtil'));

// Repositories
const CandidateRepository = new (use('App/Helpers/CandidateRepository'))();
const blueSheetRepository = new (use('App/Helpers/BlueSheetRepository'))();
const RecruiterRepository = new (use('App/Helpers/RecruiterRepository'))();
const UserRepository = new (use('App/Helpers/UserRepository'))();
const ReferenceReleaseRepository = new (use('App/Helpers/ReferenceReleaseRepository'))();

// Models
const Candidate = use('App/Models/Candidate');
const CandidateHasFile = use('App/Models/CandidateHasFile');
const CandidateStatus = use('App/Models/CandidateStatus');
const TimeStartType = use('App/Models/TimeStartType');
const CandidateType = use('App/Models/CandidateType');

/**
 * Resourceful controller for interacting with candidates
 */
class CandidateController {
  constructor() {
    const bindedDefaultFilterResolver = defaultWhereResolver.bind(this);
    const bindedMultipleFilterResolver = multipleWhereResolver.bind(this);
    const buildDefaultMultipleFilterEntry = (column) => ({
      resolver: bindedMultipleFilterResolver,
      column,
      parser: multipleFilterParser
    });
    this._filterOptionsColumnMap = {
      industryId: {resolver: bindedDefaultFilterResolver, column: 'spec.industry_id'},
      stateId: {resolver: bindedDefaultFilterResolver, column: 'cty.state_id'},
      cityId: {resolver: bindedDefaultFilterResolver, column: 'add.city_id'},
      zip: {resolver: bindedDefaultFilterResolver, column: 'add.zip'},
      userFilter: {resolver: this.userFilterResolver.bind(this)},
      positionId: {resolver: bindedDefaultFilterResolver, column: 'pst.id'},
      specialtyId: {resolver: bindedDefaultFilterResolver, column: 'ca.specialty_id'},
      recruiterId: {resolver: this.recruiterFilterResolver.bind(this), column: 'rec.id'},
      subspecialtyId: {resolver: bindedDefaultFilterResolver, column: 'ca.subspecialty_id'},
      typeId: {resolver: bindedDefaultFilterResolver, column: 'bsht.candidate_type_id'},
      coachId: {resolver: this.coachFilterResolver.bind(this)},
      companyId: {resolver: bindedDefaultFilterResolver, column: 'companies.id'},
      statusId: {column: 'ca.status_id', resolver: this.statusWhereResolver},

      industryIds: buildDefaultMultipleFilterEntry('spec.industry_id'),
      stateIds: buildDefaultMultipleFilterEntry('cty.state_id'),
      cityIds: buildDefaultMultipleFilterEntry('add.city_id'),
      zips: buildDefaultMultipleFilterEntry('add.zip'),
      positionIds: {resolver: positionFilterResolver, column: 'pst.id', parser: multipleFilterParser},
      specialtyIds: buildDefaultMultipleFilterEntry('ca.specialty_id'),
      recruiterIds: buildDefaultMultipleFilterEntry('rec.id'),
      subspecialtyIds: buildDefaultMultipleFilterEntry('ca.subspecialty_id'),
      typeIds: buildDefaultMultipleFilterEntry('bsht.candidate_type_id'),
      coachIds: {resolver: this.multipleCoachFilterResolver.bind(this), parser: multipleFilterParser},
      companyIds: buildDefaultMultipleFilterEntry('companies.id'), 
      countryIds: buildDefaultMultipleFilterEntry('cty.country_id'), 
      statusIds: {resolver: this.statusesWhereResolver, column: 'ca.status_id', parser: multipleFilterParser},
    };
    this._orderColumnsMap = {
      id: 'ca.id',
      title: 'title',
      full_name: 'pi.full_name',
      functional_title: 'pst.title',
      industry: 'spec.industry',
      recruiter: 'rec.user_name',
      state: 'cty.state',
      city: 'cty.title',
      country: 'cty.country',
      specialty_title: 'spec.title',
      status: 'cas.title',
      minimum_salary: 'bsht.minimum_salary',
      good_salary: 'bsht.good_salary',
      no_brainer_salary: 'bsht.no_brainer_salary',
      created_at: 'ca.created_at',
      coach: 'coach.user_name',
      current_company: 'current_company',
      location: Database.raw("(select concat(cty.title,', ',cty.state_slug))"),
      type: 'catype.title',
      last_activity_date: 'ca.last_activity_date',
      email: 'ca.email',
      subspecialty: 'sub.title'
    };
  }

  statusWhereResolver({ query, column, value, operator = '=' }) {
    query.where(column, operator, value);

    if (value != CandidateStatusSchemes.Inactive) {
      query.where('ca.status_id', '!=', CandidateStatusSchemes.Inactive);
    }
  }

  statusesWhereResolver({ query, column, value }) {
    query.whereIn(column, value);

    if (!value.includes(CandidateStatusSchemes.Inactive)) {
      query.where('ca.status_id', '!=', CandidateStatusSchemes.Inactive);
    }
  }

  recruiterFilterResolver({query, column, value}) {
    const self = this;
    query.where(function () {
      this.where(column, value)
      .orWhere(self.getMultipleRecruitersClause([value],AdditionalRecruiterTypes.Accountable))
    });
  }

    async userFilterResolver({query, value, user_id}) {
    const self = this;
    switch (Number(value)) {
      case userFilters.Mine:
        query.where(function () {
          this.where('ca.recruiter_id', user_id)
          .orWhere(self.getMultipleRecruitersClause([user_id], AdditionalRecruiterTypes.Accountable))
        })
        break;
      case userFilters.MyIndustries:
        await RecruiterRepository.applyDigFilters(user_id, query, 'spec.industry_id', 'cty.state_id', false);
        break;
      case userFilters.MyTeam:
        const recruitersOnMyTeam = await RecruiterRepository.recruiterOnTeam(user_id);
        query.where(function () {
          this.whereIn(`ca.created_by`, recruitersOnMyTeam)
              .orWhereIn(`ca.recruiter_id`,recruitersOnMyTeam)
              .orWhere(self.getMultipleRecruitersClause(recruitersOnMyTeam,AdditionalRecruiterTypes.Accountable))
        });
        break;
      case userFilters.MyCollaborations:
        query.where(self.getMultipleRecruitersClause([user_id], AdditionalRecruiterTypes.Collaborator));
        break;
      case userFilters.FreeGame:
        query.where('ca.free_game', true);
        break;
    }
  }

  async multipleCoachFilterResolver({query, value}) {
    const self = this;
    const coachIds = value;
    const recruitersOnCoachTeam = await RecruiterRepository.recruitersByUsers(coachIds, 'coach_id');
    recruitersOnCoachTeam.push(...coachIds.map(coachId => ({recruiter_id: Number(coachId)})));
    const whereInClauseRecruiters = recruitersOnCoachTeam.map((recruiter) => recruiter.recruiter_id);
    query.where(function () {
      this.whereIn(`ca.created_by`, whereInClauseRecruiters)
          .orWhereIn(`ca.recruiter_id`,whereInClauseRecruiters)
          .orWhere(self.getMultipleRecruitersClause(whereInClauseRecruiters,AdditionalRecruiterTypes.Accountable));
    });
  }

  async coachFilterResolver({query, value}) {
    const self = this;
    const coachId = value;
    const recruitersOnCoachTeam = await RecruiterRepository.recruitersByUser(coachId, 'coach_id');
    recruitersOnCoachTeam.push({recruiter_id:Number(coachId)})
    const whereInClauseRecruiters = recruitersOnCoachTeam.map((recruiter) => recruiter.recruiter_id);
    query.where(function () {
      this.whereIn(`ca.created_by`, whereInClauseRecruiters)
          .orWhereIn(`ca.recruiter_id`,whereInClauseRecruiters)
          .orWhere(self.getMultipleRecruitersClause(whereInClauseRecruiters,AdditionalRecruiterTypes.Accountable));
    });
  }

  /**
   * Creates a Candidate.
   * POST candidates
   *
   * @method store
   *
   * @param {Authentication} ctx.auth
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   *
   * @return {Object} Created Candidate with a succes message or an error code
   *
   */
  async store({ auth, request, response }) {
    const contactData = request.only(['phone', 'mobile', 'personal_email', 'ext']);
    const addressData = request.only(['zip', 'city_id']);
    const personalInfoData = request.only(['first_name', 'last_name']);
    const candidateData = request.only([
      'industry_id',
      'position_id',
      'status_id',
      'email',
      'title',
      'link_profile',
      'hot_item',
      'hot_item_date',
      'source_type_id',
      'current_company',
      'blueSheet',
      'specialty_id',
      'subspecialty_id',
      'recruiter_id',
      'files',
    ]);
    const companyId = request.input('company_id');

    const result = await CandidateRepository.create(
      contactData,
      addressData,
      personalInfoData,
      candidateData,
      auth.current.user.id,
      companyId,
    );
    

    return response.status(result.code).send(result);
  }

  /**
   * Creates a Candidate's Employer Company.
   * POST candidates/:id/employer-company
   *
   * @param {Authentication} ctx.auth
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   *
   * @return {Object} Created Employer Company relation with a succes message or an error code
   *
   */
  async storeEmployerCompany({ auth, request, response, params }) {
    try {
      const candidateId = Number(params.id);
      const companyId = request.input('company_id');

      const result = await CandidateRepository.addNewCompanyEmployerRelation(
        candidateId,
        companyId,
        auth.current.user.id,
      );

      return response.status(result.code).send(result.success ? result.data : result);
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
      return response
        .status(500)
        .send({ success: false, message: "Something went wrong while creting the candidate's employer"});
    }
  }

  /**
   * Display a single candidate.
   * GET candidates/:id
   *
   * @method show
   *
   * @param {object} ctx
   * @param {Response} ctx.response
   *
   * @return {Object} Response with the candidate object or an error
   */
  async show({ params, request, auth, response }) {
    try {
      const mode = request.input('mode') || 'all';
      const userId = auth.current.user.id;

      const candidate = await CandidateRepository.details(params.id, mode, userId);

      if (!candidate) {
        return response.status(404).send({
          message: 'The Candidate was not found',
        });
      }
      return response.status(200).send(candidate);
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
      return response.status(500).send({
        message: 'There was a problem retrieving the candidate, please try again later',
      });
    }
  }

  /**
   * Display a list of suggested companies.
   * GET candidates/:id/suggested-companies
   *
   * @param {object} ctx
   * @param {Response} ctx.response
   *
   * @return {Object} Response with the candidate object or an error
   */
  async indexSuggestedCompanies({ params, request, response }) {
    try {
      const limit = request.input('limit');

      const result = await CandidateRepository.getSuggestedCompanies(params.id, limit);

      return response.status(result.code).send(result.success ? result.data : result);
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
      return response.status(500).send({
        message: 'There was a problem while retrieving the suggested companies',
      });
    }
  }

  /**
   * Show a list of all candidates.
   * GET candidates
   *
   * @method index
   *
   * @param {Authentication} ctx.auth
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   *
   * @return {Object} A pagination object
   */
  async index({ auth, request, response }) {
    const user_id = auth.current.user.id;
    try {
      const candidates = await this.listingQuery(request.all(), user_id); //Mover abajo

      return response.status(200).send(candidates);
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
      return response.status(500).send({
        message: 'There was a problem retrieving all the candidates, please try again later',
      });
    }
  }


  /**
   * The logic behind the index was modularized here, while I wanted to put this in the repository, it seems that that applywhereclause is
   *  deeply rooted to be here, in the controller, and fixing it will take time
   * GET candidates
   *
   * @method index
   *
   * @param {object} queryParams - Contains everything passed as query params from the get requestes
   * @param {number} user_id
   *
   * @return {Object} A pagination object
   */
  async listingQuery(queryParams, user_id) {
    const { page = 1, perPage = 10, orderBy, direction, statuses, keyword } = queryParams;

    const employerCompany = Database.table('company_has_candidate_employees')
      .select('candidate_id', 'company_id')
      .distinct()
      .where('is_current_company', true)
      .as('employee');

    const query = Database.table('candidates as ca');
    query
      .select([
        'ca.id',
        'pi.full_name',
        'ca.title',
        'cty.state as state',
        'cty.title as city',
        'cty.country as country',
        Database.raw(
          `(CASE WHEN sub.title IS NOT NULL THEN CONCAT(spec.title, ': ', sub.title)
                ELSE spec.title END) AS specialty_title`
        ),
        'pst.title as functional_title',
        'bsht.minimum_salary',
        'bsht.good_salary',
        'bsht.no_brainer_salary',
        'ca.created_at',
        'rec.user_name as recruiter',
        'coach.user_name as coach',
        Database.raw("coalesce(companies.name, ca.current_company, '') as current_company"),
        'companies.id as company_id',
        Database.raw("(select concat(cty.title,', ',cty.state_slug)) as location"),
        Database.raw('(select array[bsht.minimum_salary ,bsht.good_salary,bsht.no_brainer_salary]) as salary_range'),
        'bsht.minimum_salary as minimum_salary',
        'bsht.good_salary as good_salary',
        'bsht.no_brainer_salary as no_brainer_salary',
        Database.raw(`json_build_object('id', cas.id, 'title', cas.title, 'color', cas.style) as status`),
        Database.raw(`json_build_object('id', catype.id, 'title', catype.title, 'color', catype.style_class_name, 'type', catype.title, 'type_class_name', catype.style_class_name) as type`),
        'ca.last_activity_date',
        'ca.email as email',
        'spec.industry as industry',
        'spec.title as specialty',
        'sub.title as subspecialty',
        'ct.phone as phone',
        'ct.mobile as mobile',
        Database.raw("json_build_object('phone', coalesce(ct.phone, ct.mobile), 'email', ca.email) as communication_actions")
      ])
      .leftJoin(employerCompany, 'ca.id', 'employee.candidate_id')
      .leftJoin('companies', 'employee.company_id', 'companies.id')
      .innerJoin('personal_informations as pi', 'ca.personal_information_id', 'pi.id')
      .innerJoin('contacts as ct', 'pi.contact_id', 'ct.id')
      .leftJoin('addresses as add', 'pi.address_id', 'add.id')
      .leftJoin('v_cities as cty', 'add.city_id', 'cty.id')
      .innerJoin('v_specialties as spec', 'ca.specialty_id', 'spec.id')
      .leftJoin('subspecialties as sub', 'sub.id', 'ca.subspecialty_id')
      .leftJoin('v_users as rec', 'ca.recruiter_id', 'rec.id')
      .leftJoin('v_users as coach', 'rec.coach_id', 'coach.id')
      .innerJoin('positions as pst', 'ca.position_id', 'pst.id')
      .innerJoin('candidate_statuses as cas', 'ca.status_id', 'cas.id')
      .leftJoin('blue_sheets as bsht', 'ca.id', 'bsht.candidate_id')
      .leftJoin('candidate_types as catype', 'catype.id', 'bsht.candidate_type_id')

    if (statuses) {
      query.whereIn('cas.id', statuses.split(','));
    }
    this.applyKeywordClause(keyword, query);
    await this.applyWhereClause(queryParams, query, user_id);
    applyOrderClause({ column: orderBy, columnsMap: this._orderColumnsMap, query, direction });
    const candidates = await query.paginate(page, perPage);

    return candidates;
  }

  /**
   * Apply a keyword  clause on the query.
   *
   * @method applyKeywordClause
   *
   * @param {String} keyword
   * @param {Knex} query
   *
   */
  applyKeywordClause(keyword, query) {
    if (keyword) {
      query.where(function () {
        this.where('rec.user_name', 'ilike', `%${keyword}%`)
          .orWhere('coach.user_name', 'ilike', `%${keyword}%`)
          .orWhere('pi.full_name', 'ilike', `%${keyword}%`)
          .orWhere('ca.title', 'ilike', `%${keyword}%`)
          .orWhere('pst.title', 'ilike', `%${keyword}%`)
          .orWhere('spec.industry', 'ilike', `%${keyword}%`)
          .orWhere('cty.title', 'ilike', `%${keyword}%`)
          .orWhere('cty.state', 'ilike', `%${keyword}%`)
          // .orWhere('companies.name', 'ilike', `%${keyword}%`)
          // .orWhere('ca.current_company', 'ilike', `%${keyword}%`) 
          .orWhere(//Lets do a coalesce, since a search that shows results that do not match the visual parameters is a bad practice
            Database.raw("coalesce(companies.name, ca.current_company, '') ilike :keyword", { keyword: `%${keyword}%` })
          )
          .orWhere('ca.email', 'ilike', `%${keyword}%`);
      });
    }
  }

  /**
   * Apply the where clause on the query.
   *
   * @method applyWhereClause
   *
   * @param {object} queryParams - Contains everything passed as query params from the get requestes
   * @param {Knex} query - The query used in the indexing
   * @param {Integer} user_id
   *
   */
  async applyWhereClause(queryParams, query, user_id) {
    const filters = {
      'industryId': queryParams.industryId,
      'stateId': queryParams.stateId,
      'cityId': queryParams.cityId,
      'zip': queryParams.zip,
      'userFilter': queryParams.userFilter,
      'positionId': queryParams.positionId,
      'specialtyId': queryParams.specialtyId,
      'recruiterId': queryParams.recruiterId,
      'subspecialtyId': queryParams.subspecialtyId,
      'typeId': queryParams.typeId,
      'coachId': queryParams.coachId,
      'companyId': queryParams.companyId,
      'statusId': queryParams.statusId,

      'industryIds': queryParams.industryIds,
      'stateIds': queryParams.stateIds,
      'cityIds': queryParams.cityIds,
      'zips': queryParams.zips,
      'userFilters': queryParams.userFilters,
      'positionIds': queryParams.positionIds,
      'specialtyIds': queryParams.specialtyIds,
      'recruiterIds': queryParams.recruiterIds,
      'subspecialtyIds': queryParams.subspecialtyIds,
      'typeIds': queryParams.typeIds,
      'coachIds': queryParams.coachIds,
      'companyIds': queryParams.companyIds,
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
        ']::int[] && (SELECT array_agg(recruiter_id) from candidate_additional_recruiters where candidate_id = ca.id and status = ? ' +
        (type ? `and type = '${type}')` : ')'),
      [...recruiters, AdditionalRecruiterStatus.Approved]
    );
  }

  /**
   * Update candidate details.
   * PUT or PATCH candidates/:id
   *
   * @method update
   *
   * @param {Authentication} ctx.auth
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   *
   * @return Response with the updated candidate or an error
   */
  async update({ auth, params, request, response }) {
    const contactData = request.only(['phone', 'mobile', 'personal_email', 'ext']);
    const addressData = request.only(['zip', 'city_id']);
    const personalInfoData = request.only(['first_name', 'last_name']);
    const candidateData = request.only([
      'current_company',
      'industry_id',
      'position_id',
      'email',
      'title',
      'link_profile',
      'source_type_id',
      'specialty_id',
      'subspecialty_id',
    ]);
    const companyId = request.input('company_id');

    const result = await CandidateRepository.update(
      params.id,
      contactData,
      addressData,
      personalInfoData,
      candidateData,
      auth.current.user.id,
      companyId,
    );
    if (result.success && result.data) {
      return response.status(result.code).send(result.data);
    }
    return response.status(result.code).send(result);
  }

  /**
   * Upload File.
   * POST candidates/:id/files
   *
   * @method storeFile
   *
   * @param {Authentication} ctx.auth
   * @param {Request} ctx.request
   * @param {object} ctx
   * @param {Response} ctx.response
   *
   * @return {Object} Response with the uploaded file or a message error
   */
  async storeFile({ auth, request, params, response }) {
    const candidate = await Candidate.find(params.id);
    if (!candidate) {
      return response.status(404).send({
        message: 'Candidate not Found',
      });
    }
    try {
      request.multipart.file('file', getMultipartConfig(), async (file) => {
        await file.runValidations();
        const error = file.error();
        if (error.message) {
          return response.status(400).send({
            message: error.message,
          });
        }
        const fileSize = file.stream.byteCount;
        const originalName = path.parse(file.clientName).name;
        const fileName = `${originalName}-${new Date().getTime()}.${file.extname}`;
        const absolutePath = await uploadFile('attachments/' + fileName, file.stream);
        if (!absolutePath) {
          return response.status(500).send({
            message: 'There was a problem uploading the file , pleae try again later!',
          });
        }
        const candidateFile = await CandidateHasFile.create({
          candidate_id: candidate.id,
          file_type_id: await fileType('ATTACHMENT'),
          url: absolutePath,
          file_name: `${originalName}.${file.extname}`,
          size: fileSize,
        });
        await candidate.merge({ updated_by: auth.current.user.id });
        await candidate.save();
        return response.status(201).send(candidateFile);
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
   *Destroy a file
   *DELETE candidates/:id/files/:fileId
   *
   * @method deleteFile
   *
   * @param {Authentication} ctx.auth
   * @param {object} ctx
   * @param {Response} ctx.response
   *
   * @return {Object} A message with a code 200 or an error code
   */
  async deleteFile({ auth, params, response }) {
    const result = await CandidateRepository.deleteFile(params.id, params.fileId, auth.current.user.id);
    return response.status(result.code).send(result);
  }

  /**
   * Reassign candidate
   * PUT or PATCH candidates/reassign/:id
   *
   * @method reassign
   *
   * @param {object} ctx
   * @param {Authentication} ctx.auth
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   *
   * @return {object} Response with the Recruiter data or an error code
   */
  async reassign({ params, auth, request, response }) {
    const candidateId = params.id;
    const recruiterId = request.input('recruiterId');
    const result = await CandidateRepository.assignToRecruiter(candidateId, recruiterId, auth.current.user.id);
    return response.status(result.code).send(result.success ? result.data : result);
  }

  /**
   * Show a list of all candidateStatus.
   * GET candidates/statuses
   *
   * @method statuses
   *
   * @param {Response} ctx.response
   *
   * @return {object} Candidate Statuses
   */
   async statuses({ request, response }) {
    const { selectable: selectableFilter } = request.only(['selectable']);

    const query = CandidateStatus.query().setHidden(auditFields);

    if (selectableFilter) {
      query.where('selectable', selectableFilter);
    }

    const candidateStatuses = await query.orderBy('title').fetch();

    return response.ok(candidateStatuses);
  }

  /**
   * Create/save a new candidate note.
   * POST candidates/:id/notes
   *
   * @method storeNote
   *
   * @param {Authentication} ctx.auth
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   * @param {object} ctx
   *
   * @return {object} Response with the created note or an error code
   */
  async storeNote({ auth, request, response, params }) {
    const { body, title } = request.only(['body', 'title']);
    const result = await CandidateRepository.createNote(body, title, params.id, auth.current.user.id);

    return response.status(result.code).send(result);
  }

  /**
   * Update a  candidate  note.
   * POST candidates/:candidateId/notes/:id
   *
   * @method updateNote
   *
   * @param {Authentication} ctx.auth
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   * @param {object} ctx
   *
   * @return {object} Response with the updated note or an error code
   */
  async updateNote({ auth, request, response, params }) {
    const { body, title } = request.only(['body', 'title']);
    const result = await CandidateRepository.updateNote(
      body,
      title,
      params.id,
      params.candidateId,
      auth.current.user.id
    );
    if (result.success && result.data) {
      return response.status(result.code).send(result.data);
    }
    return response.status(result.code).send(result);
  }

  /**
   * Destroy a company note.
   * Delete candidates/:candidateId/notes/:id
   *
   * @method destroyNote
   *
   * @param {Authentication} ctx.auth
   * @param {Response} ctx.response
   * @param {object} ctx
   *
   * @return {Object} A succes of the deleted note or an error code
   */
  async destroyNote({ auth, response, params }) {
    const result = await CandidateRepository.deleteNote(params.id, params.candidateId, auth.current.user.id);

    return response.status(result.code).send(result);
  }

  /**
   * Update a  company activity log.
   * POST candidates/:candidateId/activityLogs/:id
   *
   * @method updateActivityLog
   *
   * @param {Authentication} ctx.auth
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   * @param {object} ctx
   *
   * @return {Object} Response with the updated activity or an error code
   */
  async updateActivityLog({ auth, request, response, params }) {
    const { body } = request.only(['body']);
    const result = await CandidateRepository.updateActivityLog(
      body,
      params.id,
      params.candidateId,
      auth.current.user.id
    );

    if (result.success && result.data) {
      return response.status(result.code).send(result.data);
    }
    return response.status(result.code).send(result);
  }

  /**
   * Destroy a candidate activity log.
   * Delete candidates/:candidateId/activityLogs/:id
   *
   * @method destroyActivityLog
   *
   * @param {Authentication} ctx.auth
   * @param {Response} ctx.response
   * @param {object} ctx
   *
   * @return {Object} Succes message or an error code
   */
  async destroyActivityLog({ auth, response, params }) {
    const result = await CandidateRepository.deleteActivityLog(params.id, params.candidateId, auth.current.user.id);

    return response.status(result.code).send(result);
  }

  /**
   * Update candidate details.
   * PUT or PATCH candidates/:id/blueSheets
   *
   * @method updateBlueSheet
   *
   * @param {Authentication} ctx.auth
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   * @param {object} ctx
   *
   * @return {Object} Response with the Bluesheet updated data or an error code
   */
  async updateBlueSheet({ auth, request, response, params }) {
    const result = await blueSheetRepository.update(request.all(), params.id, params.blueSheetId, auth.current.user.id);

    if (result.success && result.data) {
      return response.status(result.code).send(result.data);
    }

    return response.status(result.code).send(result);
  }

  /**
   * Create/save a new candidate note.
   * POST candidates/:id/activityLogs
   *
   * @method storeActivityLog
   *
   * @param {Authentication} ctx.auth
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   * @param {object} ctx
   *
   * @return {Object} Response with the created activity or an error code
   */
  async storeActivityLog({ auth, request, response, params }) {
    const { body, activity_log_type_id } = request.only(['body', 'activity_log_type_id']);
    const result = await CandidateRepository.createActivityLog(
      body,
      activity_log_type_id,
      params.id,
      auth.current.user.id
    );

    return response.status(result.code).send(result);
  }

  /**
   * Create/save a new external candidate activity log.
   * POST candidates/:id/external/activityLogs
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
   async storeExternalActivityLog({ request, response, params }) {
    const { 
      body, 
      activity_log_type_id, 
      user_id,
      optional_params
    } = request.only(['body', 'activity_log_type_id', 'user_id', 'optional_params']);

    const result = await CandidateRepository.createActivityLog(
      body,
      activity_log_type_id,
      params.id,
      user_id,
      optional_params
    );

    return response.status(result.code).send(result);
  }

  /**
   * Show a list of all TimeStartTypes.
   * GET candidates/bluesheets/timetypes
   *
   * @method timeStartTypes
   *
   * @param {Response} ctx.response
   *
   * @return {Array} TimeTypes Objects or []
   */
  async timeStartTypes({ response }) {
    const timetypes = await TimeStartType.query().setHidden(auditFields).fetch();

    return response.ok(timetypes);
  }

  /**
   * Show a list of all jobOrderTypes.
   * GET bluesheets/jobOrderTypes
   *
   * @method candidateTypes
   *
   * @param {Response} ctx.response
   *
   * @return {Array|Object} The candidate types objects array or a reponse code error
   */
  async candidateTypes({ response }) {
    try {
      const candidateTypes = await CandidateType.query().where('available', 1).setHidden(auditFields).orderBy('id').fetch();

      return response.ok(candidateTypes);
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      return response.status(500).send({
        message: 'There was a problem getting the candidateTypes, please try again later',
      });
    }
  }

  /**
   * Show a list of all job orders to assign to the candidate.
   * GET candidates/:id/job-orders-to-assign
   *
   * @method jobOrdersToAssign
   *
   * @param {object} ctx
   * @param {Response} ctx.response
   *
   * @return {Array|Object} The candidate types objects array or a reponse code error
   */
  async jobOrdersToAssign({ params, response }) {
    try {
      const result = await CandidateRepository.jobOrdersToAssign(params.id);
      return response.status(result.code).send(result.data || result);
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
      return response.status(500).send({
        message: 'There was a problem getting the job orders, please try again later',
      });
    }
  }

  /**
   * Match an existing job order to a Candidate
   * POST candidates/:id/assign-job-order
   *
   * @method assignJobOrder
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   *
   * @return {Object} Response with the job order assigned or an error code
   */
  async assignJobOrder({ params, request, response }) {
    try {
      const { jobOrderId } = request.all();
      const result = await CandidateRepository.assignJobOrder(params.id, jobOrderId);
      return response.status(result.code).send(result.data || result);
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      return response.status(500).send({
        message: 'There was a problem assigning the Job Order, please try again later',
      });
    }
  }

  /**
   * Remove an existing job order from a candidate
   * POST candidates/:id/remove-job-order/:jobOrderId
   *
   * @method removeJobOrder
   *
   * @param {object} ctx
   * @param {Response} ctx.response
   *
   * @return {Object} Message or success or an error code
   */
  async removeJobOrder({ params, response }) {
    try {
      const result = await CandidateRepository.removeJobOrder(params.id, params.jobOrderId);
      return response.status(result.code).send(result);
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
      return response.status(500).send({
        message: 'There was a problem removing the Job Order, please try again later',
      });
    }
  }

  async storeFromName({ auth, params, request, response }) {
    const result = await CandidateRepository.createFromName(request, auth.current.user.id, params.id);

    return response.status(result.code).send(result);
  }

  async getAssignmentHistory({ params, response }) {
    const candidateId = params.id;
    const result = await CandidateRepository.getAssignationHistory(candidateId);
    return response.status(result.code).send(result.data);
  }

  /**
   * @deprecated  
   * 
   * Get all the candidate metrics for an user
   * GET candidates/metricsByUser
   *
   * @method metricsByUser
   *
   * @param {Authentication} ctx.auth
   * @param {Response} ctx.response
   *
   * @return {Object} CandidateMetrics data or an error code
   */
  async metricsByUser({ auth, response, request }) {
    const userId = auth.current.user.id;
    const recruiterId = request.input('recruiterId');
    const isCoach = await UserRepository.hasRole(userId, userRoles.Coach);
    const result = await CandidateRepository.getMetricsByUser(isCoach ? recruiterId || userId : userId);
    return response.status(result.code).send(result.data);
  }

  /**
   * @deprecated  
   * 
   * Get all the metrics for a candidate
   *
   * @method getOperatingMetrics
   *
   * @param {object} ctx
   * @param {Response} ctx.response
   *
   * @return {Object} Message or success or an error code
   */
  async operatingMetrics({ auth, params, response }) {
    const result = await CandidateRepository.getOperatingMetrics(params.id);
    return response.status(result.code).send(result.data || result);
  }

  /**
   * POST
   * Request a new recruiter for a candidate
   *
   * @method requestAdditionalRecruiter
   *
   * @param {object} ctx
   * @param {Response} ctx.response
   *
   * @return {Object} Message or success or an error code
   */
  async requestAdditionalRecruiter({ auth, params, request, response }) {
    const requestData = request.only(['notes', 'type', 'target_recruiter_id', 'recruiter_to_collaborate_id']);
    const result = await CandidateRepository.createAdditionalRecruiterRequest(
      params.id,
      requestData,
      auth.current.user
    );
    return response.status(result.code).send(result.data || result);
  }

  /**
   * Returns the info of the additional recruiter fo a candidate
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
    const result = await CandidateRepository.getAdditionalRecruitersInfo(
      params.id,
      status || AdditionalRecruiterStatus.Approved
    );
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
    const { requestId, id: candidateId } = params;
    const payload = request.only(['target_recruiter_id', 'recruiter_to_collaborate_id']);

    const result = await CandidateRepository.updateAdditionalRecruiter(
      requestId,
      candidateId,
      payload,
      auth.current.user.id
    );

    return response.status(result.code).send(result);
  }

  /**
   * Delete an additional recruiter
   * Each record on CandidateAdditionalRecruiter represents a request to add another recruiter
   *
   * @method deleteAdditionalRecruiter
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   *
   *
   * @return {Object} Message or success or an error code
   */
  async deleteAdditionalRecruiter({ auth, params, response }) {
    const { requestId, id: candidateId } = params;
    const loggedUserId = auth.current.user.id;

    const result = await CandidateRepository.deleteAdditionalRecruiter(requestId, candidateId, loggedUserId);

    return response.status(result.code).send(result);
  }

    /**
   * Returns the list of placemnents for a candidate
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
    const result = await CandidateRepository.placements(params.id);
    return response.status(result.code).send(result.data || result);
  }

  /**
   * Returns the reference release template 
   *
   * @method referenceTemplate
   * 
   * @param {object} ctx.
   * @param {Response} ctx.response
   *
   * 
   * @return {Object} Message or success or an error code
   */
  async referenceTemplate({ response }) {
    const result = await ReferenceReleaseRepository.getTemplateEmail();
    return response.status(result.code).send(result.data || result);
  }

    /**
   * Create and Send the reference release email
   *
   * @method sendReferenceRelease
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   *
   *
   * @return {Object} Message or success or an error code
   */
  async sendReferenceRelease({ auth, params, response, request }) {
    const emailData = request.only([
      'to',
      'cc',
      'bcc',
      'subject',
      'body'
    ]);

    const result = await ReferenceReleaseRepository.createAndSend(emailData, params.id, auth.current.user.id);
    return response.status(result.code).send(result);
  }

  /**
 * Show a list of all candidate logs.
 * GET candidates/:id/logs
 *
 * @param {Response} ctx.response
 */
  async getChangeLogs({ params, response, request }) {
    const entity = request.input('entity');
    const result = await CandidateRepository.getLogs(params.id, entity);
  
    if (result.success && result.data) {
      return response.status(result.code).send(result.data);
    }

    return response.status(result.code).send(result);
  }

    /**
   * Returns the list of reference release emails for a candidate
   *
   * @method referenceReleases
   * 
   * @param {object} ctx.
   * @param {Response} ctx.response
   *
   * 
   * @return {Object} Message or success or an error code
   */
  async referenceReleases({ params, response }) {
    const result = await ReferenceReleaseRepository.getByCandidate(params.id);
    return response.status(result.code).send(result.data || result);
  }
  
}

module.exports = CandidateController;
