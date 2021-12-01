'use strict';

const appInsights = require('applicationinsights');
const Database = use('Database');
const { uploadFile, getMultipartConfig, deleteServerFile } = use('App/Helpers/FileHelper');
const Company = use('App/Models/Company');
const CompanyHasFile = use('App/Models/CompanyHasFile');
const CompanyRepository = new (use('App/Helpers/CompanyRepository'))();
const {multipleFilterParser, defaultWhereResolver, multipleWhereResolver} = (use('App/Helpers/QueryFilteringUtil'));
const RecruiterRepository = new (use('App/Helpers/RecruiterRepository'))();
const path = require('path');
const { userFilters, EntityTypes, OperationType } = use('App/Helpers/Globals');
const { fileType } = use('App/Helpers/FileType');
const CompanyTypeReassure = use('App/Models/CompanyTypeReassure');

//Utils
const Event = use('Event');
const EventTypes = use('App/Helpers/Events');
const Antl = use('Antl');

/** @typedef {import('@adonisjs/framework/src/Request')} Request */
/** @typedef {import('@adonisjs/framework/src/Response')} Response */
/** @typedef {import('@adonisjs/framework/src/View')} View */

/**
 * Resourceful controller for interacting with companies
 */

class CompanyController {
  constructor() {
    this._orderColumnsMap = {
      'type': 'ctype.title',
      'cp.name': 'cp.name',
      'name': 'name',
      'itry.title': 'itry.title',
      'industry': 'spec.industry_title',
      'specialty': 'spec.title',
      'specialty_title': 'spec.title',
      'recruiter_name': 'recruiter_name',
      'pri.first_name': 'recruiter_name',
      'recruiter': 'recruiter_name',
      'coach_name': 'rec.coach_name',
      'cty.title': 'city.title',
      'city': 'city.title',
      'state': 'city.state',
      'country': 'city.country',
      'location': 'city.title',
      'cp.created_at': 'cp.created_at',
      'last_activity_date': 'last_activity_date',
      'industry': 'industry',
      'specialty': 'specialty'
    };

    const buildDefaultMultipleFilterEntry = (column) => ({
      resolver: multipleWhereResolver.bind(this),
      column,
      parser: multipleFilterParser
    });
    const bindedDefaultWhereResolver = defaultWhereResolver.bind(this);
    this._filterOptionsColumnMap = {
      industryId: {resolver: bindedDefaultWhereResolver, column: 'spec.industry_id'},
      stateId: {resolver: bindedDefaultWhereResolver, column: 'city.state_id'},
      cityId:  {resolver: bindedDefaultWhereResolver, column: 'cp.city_id'},
      zip: {resolver: bindedDefaultWhereResolver, column: 'cp.zip'},
      userFilter: {resolver: this.userFilterResolver.bind(this)},
      specialtyId: {resolver: bindedDefaultWhereResolver, column: 'spec.id'},
      subspecialtyId: {resolver: bindedDefaultWhereResolver, column: 'cp.subspecialty_id'},
      coachId: {resolver: this.coachFilterResolver.bind(this)},
      recruiterId: {resolver: bindedDefaultWhereResolver, column: 'rec.id'},
      typeId: {resolver: bindedDefaultWhereResolver, column: 'company_type_id'},
      name: {resolver: bindedDefaultWhereResolver, column: 'cp.name'},
      phone: {resolver: this.phoneFilterResolver.bind(this), column: 'contacts.phone'},

      industryIds: buildDefaultMultipleFilterEntry('spec.industry_id'),
      stateIds: buildDefaultMultipleFilterEntry('city.state_id'),
      cityIds:  buildDefaultMultipleFilterEntry('cp.city_id'),
      zips: buildDefaultMultipleFilterEntry('cp.zip'),
      specialtyIds: buildDefaultMultipleFilterEntry('spec.id'),
      subspecialtyIds: buildDefaultMultipleFilterEntry('cp.subspecialty_id'),
      coachIds: {resolver: this.multipleCoachFilterResolver.bind(this), parser: multipleFilterParser},
      recruiterIds: buildDefaultMultipleFilterEntry('rec.id'),
      typeIds: buildDefaultMultipleFilterEntry('company_type_id'),
      countryIds: buildDefaultMultipleFilterEntry('city.country_id'),
    };
  }

  multipleWhereResolver({query, column, value}) {
    query.whereIn(column, value);
  }

  async coachFilterResolver({query, value}) {
    const coachId  = value;
    const recruitersOnCoachTeam = await RecruiterRepository.recruitersByUser(coachId, 'coach_id');
    recruitersOnCoachTeam.push({recruiter_id:Number(coachId)})
    const whereInClauseRecruiters = recruitersOnCoachTeam.map((recruiter) => recruiter.recruiter_id);
    query.where(function () {
      this.whereIn(`cp.created_by`, whereInClauseRecruiters)
          .orWhereIn(`cp.recruiter_id`,whereInClauseRecruiters);
    });
  }

  async multipleCoachFilterResolver({query, value}) {
    const coachIds = value;
    const recruitersOnCoachTeam = await RecruiterRepository.recruitersByUsers(coachIds, 'coach_id');
    recruitersOnCoachTeam.push(...coachIds.map(coachId => ({recruiter_id:Number(coachId)})))
    const whereInClauseRecruiters = recruitersOnCoachTeam.map((recruiter) => recruiter.recruiter_id);
    query.where(function () {
      this.whereIn(`cp.created_by`, whereInClauseRecruiters)
          .orWhereIn(`cp.recruiter_id`,whereInClauseRecruiters);
    });
  }

  async userFilterResolver({query, user_id, value}) {

    switch (Number(value)) {
      case userFilters.Mine:
        query.where('cp.recruiter_id', user_id);
        break;
      case userFilters.MyIndustries:
        await RecruiterRepository.applyDigFilters(user_id, query, 'spec.industry_id','city.state_id',false)
        break;
      case userFilters.MyTeam:
        const recruitersOnMyTeam = await RecruiterRepository.recruiterOnTeam(user_id);
        query.where(function () {
          this.whereIn(`cp.created_by`, recruitersOnMyTeam)
              .orWhereIn(`cp.recruiter_id`,recruitersOnMyTeam)
        });
        break;
    }
  }

  phoneFilterResolver({query, column, value}) {
    query.joinRaw('INNER JOIN contacts ON cp.contact_id = contacts.id');
    query.where(column, value);
  }
  /**
   * Show a list of all companies.
   * GET companies
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   * @param {View} ctx.view
   */
  async index({ auth, request, response }) {
    let { page, perPage } = request.all();
    const user_id = auth.current.user.id;
    try {
      const query = Database.table('companies as cp');
      query
        .select([
          'cp.id',
          'cp.name',
          'city.state',
          'city.state_slug',
          'city.title as city',
          'city.country',
          'city.country_slug',
          'cp.zip',
          'spec.industry as industry',
          'spec.title as specialty',
          'sub.title as subspecialty',
          'ctype.id as type_id',
          'ctype.title as type_title',
          'ctype.color as type_color',
          'cp.created_at',
          'cp.last_activity_date',
          'mgtype.title as migration_type',
          'rec.user_name as recruiter_name',
          'rec.coach_name',
          'ct.phone',
          'ct.phone as phone_actions',
          'cp.email as email'
        ])
        .innerJoin('v_specialties as spec', 'cp.specialty_id', 'spec.id')
        .leftJoin('subspecialties as sub', 'sub.id', 'cp.subspecialty_id')
        .leftJoin('v_users as rec', 'rec.id', 'cp.recruiter_id')
        .leftJoin('company_types as ctype', 'cp.company_type_id', 'ctype.id')
        .leftJoin('v_cities as city', 'cp.city_id', 'city.id')
        .leftJoin('migration_source_types as mgtype','cp.migration_source_type_id','mgtype.id')
        .leftJoin('contacts as ct', 'cp.contact_id', 'ct.id')

      this.applyKeywordClause(request, query);
      await this.applyWhereClause(request, query, user_id);
      this.applyOrderClause(request, query);
      const companies = await query.paginate(page ? page : 1, perPage ? perPage : 10);

      return response.status(200).send(this.withCustomFormatting(companies));
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      return response.status(500).send({
        message: 'There was a problem getting the company, please try again later',
      });
    }
  }

  withCustomFormatting(paginatedCompanies) {
    if(paginatedCompanies.data) {
      const companiesList = paginatedCompanies.data;
      return {
        ...paginatedCompanies,
        data: companiesList.map(company => ({
          ...company,
          location: `${company.country_slug}: ${company.city}, ${company.state_slug}`,
          type: {
            id: company.type_id,
            title: company.type_title,
            color: company.type_color
          },
          specialty_title: company.subspecialty ? `${company.specialty}: ${company.subspecialty}` : company.specialty,
          communication_actions: {
            phone: company.phone, 
            email: company.email
          }
        }))
      }
    }
    return paginatedCompanies;
  }

  /**
   * Listing of all the employees of the company
   *
   * GET /:id/employees
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async indexEmployees({ auth, request, response }) {
    try {
      const companyId = request.params.id;
      const paginationData = request.only(['page', 'perPage']);

      const result = await CompanyRepository.getEmployees(companyId, paginationData);

      return response.status(result.code).send(result.success ? result.data : result);
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
      return response
        .status(500)
        .send({ success: false, message: 'Something went wrong while getting company employees' });
    }
  }

  /**
   * Return the where clause to apply on the query.
   * GET where clause
   *
   * @param {Request} ctx.request
   */
  applyKeywordClause(request, query) {
    const { keyword } = request.all();
    if (keyword) {
      query.where(function () {
        this.where('cp.name', 'ilike', `%${keyword}%`);
      });
    }
  }

  /**
   * Return the where clause to apply on the query.
   * GET where clause
   *
   * @param {Request} ctx.request
   */
  async applyWhereClause(request, query, user_id) {
    const filters = request.only([
      'industryId',
      'stateId',
      'cityId',
      'zip',
      'signed',
      'notSigned',
      'userFilter',
      'specialtyId',
      'subspecialtyId',
      'coachId',
      'recruiterId',
      'typeId',
      'name',
      'phone',

      'industryIds',
      'stateIds',
      'cityIds',
      'zips',
      'specialtyIds',
      'subspecialtyIds',
      'coachIds',
      'recruiterIds',
      'typeIds',
      'countryIds'
    ]);
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

  /**
   * Return the order clause to apply on the query.
   * GET order clause
   *
   * @param {Request} ctx.request
   */
  applyOrderClause(request, query) {
    const { direction = 'asc', orderBy = 'name' } = request.all();
    const validDirections = ['asc', 'desc'];

    const orderColumn = this._orderColumnsMap[orderBy] || this._orderColumnsMap['name'];
    const orderDirection = validDirections.find((dir) => dir.toLowerCase() === direction.toLowerCase()) || validDirections[0];
    query.orderByRaw(`${orderColumn} ${orderDirection} NULLS LAST`);
  }

  /**
   * Create/save a new company.
   * POST companies
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async store({ auth, request, response }) {
    try {
      const dataToCreate = request.only([
        'name',
        'address',
        'phone',
        'ext',
        'email',
        'website',
        'link_profile',
        'hiringAuthorities',
        'fileId',
        'specialty_id',
        'subspecialty_id',
        'zip',
        'city_id',
        'recruiter_id',
        'feeAgreement'
      ]);
      const candidateIds = request.input('candidate_ids')
      const nameIds = request.input('name_ids')
      const userId = auth.current.user.id;

      const result = await CompanyRepository.create(dataToCreate, userId, candidateIds, nameIds);

      return response.status(result.code).send(result);
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
      return {
        success: false,
        code: 500,
        message: 'Something went wrong while saving the company',
      };
    }

  }

  /**
   * Display a single company.
   * GET companies/:id
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   * @param {View} ctx.view
   */
  async show({ request, params, auth, response }) {
    try {
      const  { excludeListings } = request.all();
      const userId = auth.current.user.id;

      const company = await CompanyRepository.details(params.id, !(excludeListings === 'true'), userId);
      if (!company) {
        return response.status(404).send({
          message: 'Company Not Found',
        });
      }

      return response.status(200).send(company);
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      return response.status(500).send({
        message: 'There was a problem retrieving the company, please try again later',
      });
    }
  }

  /**
   * Create a company type reassure
   * POST companies
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async createTypeReassure({ auth, request, params, response }) {
    try {
      const companyId = Number(params.id);
      const userId = auth.current.user.id;
      const companyTypeId = request.input('company_type_id');

      const result = await CompanyRepository.storeCompanyTypeReassure(companyId, userId, companyTypeId);

      return response.status(result.code).send(result.success ? result.data : result);
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
      return {
        success: false,
        code: 500,
        message: 'Something went wrong while reassuring the company type',
      };
    }
  }

  /**
   * Update a pending company type reassure
   * PATCH companies
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async updatePendingTypeReassure({ auth, request, params, response }) {
    try {
      const companyId = Number(params.id);
      const companyTypeReassureId = Number(params.reassureId);
      const userId = auth.current.user.id;
      const companyTypeId = request.input('company_type_id');

      const result = await CompanyRepository.updatePendingTypeReassure(companyId, userId, companyTypeId, companyTypeReassureId);

      return response.status(result.code).send(result.success ? result.data : result);
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
      return {
        success: false,
        code: 500,
        message: 'Something went wrong while updating the the company type reassure',
      };
    }
  }

  /**
   * Create a company type reassure verification
   * POST companies
   *
   * @description This closes the loop started from the @method createTypeReassure , this should be called only from OPS
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async createTypeReassureOpsVerifications({ auth, request, params, response }) {
    try {
      const companyId = Number(params.id);
      const userId = auth.current.user.id;
      const fileId = request.input('file_id');
      const companyTypeId = request.input('company_type_id');
      const companyTypeReassureId = request.input('company_type_reassure_id');

      const result = await CompanyRepository.storeCompanyTypeReassureOpsVerification(companyId, userId, fileId, companyTypeId, companyTypeReassureId);

      return response.status(result.code).send(result.success ? result.data : result);
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
      return {
        success: false,
        code: 500,
        message: 'Something went wrong while verifying the company type',
      };
    }
  }

  /**
   * Checks if the company has any requested reassures
   * GET companies
   *
   * @description Returns the ids of the requested reassures, should be only usable from OPS users
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async getPendingTypeReassures({ auth, params, response }) {
    try {
      const userId = auth.current.user.id;
      const companyId = Number(params.id);

      const result = await CompanyRepository.getPendingReassures(userId, companyId);

      return response.status(result.code).send(result.success ? result.data : result);
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
      return {
        success: false,
        code: 500,
        message: 'Something went wrong while obtaining the company pending type verifications',
      };
    }
  }

  /**
   * Returns the information of one specific reassure
   * GET companies
   *
   * @description Since the modal that Ops sees has some information not easily available, this endpoint aim to return such information
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async getTypeReassureInformation({ auth, params, response }) {
    try {
      const userId = auth.current.user.id;
      const companyId = Number(params.id);
      const companyTypeReassureId = Number(params.referenceId);

      const result = await CompanyRepository.getTypeReassureInformation(userId, companyId, companyTypeReassureId);

      return response.status(result.code).send(result.success ? result.data : result);
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
      return {
        success: false,
        code: 500,
        message: 'Something went wrong while obtaining the company pending type verifications',
      };
    }
  }

  /**
   * Searches possibles employees for a company
   * GET /companies/possible-employees
   *
   * @param {Authentication} ctx.auth
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   *
   * @return {Object} Listing of possibles employees
   */
  async searchPossibleEmployees({ auth, request, response }) {
    try {
      const { keyword, limit, company_id } = request.only(['keyword', 'limit', 'company_id']);

      const result = await CompanyRepository.searchPossibleEmployees(company_id, limit, keyword);

      return response.status(result.code).send(result.success ? result.data : result);
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      return response.status(500).send({
        message: 'There was a problem while getting the possible employees',
      });
    }
  }

  /**
   * Update company details.
   * PUT or PATCH companies/:id
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async update({ auth, params, request, response }) {
    const result = await CompanyRepository.update(params, request.all(), auth.current.user.id);
    if (result.success && result.data) {
      return response.status(result.code).send(result.data);
    }
    return response.status(result.code).send(result);
  }

  /**
   * Create/save a new company note.
   * POST companies/:id/notes
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async storeNote({ auth, request, response, params }) {
    const result = await CompanyRepository.createNote(request.all(), params.id, auth.current.user.id);
    return response.status(result.code).send(result);
  }

  /**
   * Update a  company  note.
   * POST companies/:companyId/notes/:id
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async updateNote({ auth, request, response, params }) {
    const result = await CompanyRepository.updateNote(request.all(), params.id, params.companyId, auth.current.user.id);
    if (result.success && result.data) {
      return response.status(result.code).send(result.data);
    }
    return response.status(result.code).send(result);
  }

  /**
   * Destroy a company note.
   * Delete companies/:companyId/notes/:id
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async destroyNote({ auth, response, params }) {
    const result = await CompanyRepository.deleteNote(params.id, params.companyId, auth.current.user.id);

    return response.status(result.code).send(result);
  }

  /**
   * Create/save a new companny activity log.
   * POST companies/:id/activityLogs
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async storeActivityLog({ auth, request, response, params }) {
    const { body, activity_log_type_id } = request.only(['body', 'activity_log_type_id']);
    const result = await CompanyRepository.createActivityLog(
      body,
      activity_log_type_id,
      params.id,
      auth.current.user.id
    );

    return response.status(result.code).send(result);
  }

  /**
   * Create/save a new external company activity log.
   * POST companies/:id/external/activityLogs
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

    const result = await CompanyRepository.createActivityLog(
      body,
      activity_log_type_id,
      params.id,
      user_id,
      optional_params
    );

    return response.status(result.code).send(result);
  }

  /**
   * Update a  company activity log.
   * POST companies/:companyId/activityLogs/:id
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async updateActivityLog({ auth, request, response, params }) {
    const result = await CompanyRepository.updateActivityLog(
      request.all(),
      params.id,
      params.companyId,
      auth.current.user.id
    );

    if (result.success && result.data) {
      return response.status(result.code).send(result.data);
    }
    return response.status(result.code).send(result);
  }

  /**
   * Destroy a company activity log.
   * Delete companies/:companyId/activityLogs/:id
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async destroyActivityLog({ auth, response, params }) {
    const result = await CompanyRepository.deleteActivityLog(params.id, params.companyId, auth.current.user.id);

    return response.status(result.code).send(result);
  }

  /**
   * Create Hiring Authority
   *
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */

   async createHiringAuthority({request, params, response}) {
    const companyId = params.id;
    const hiringAuthorityData = request.only([
      'first_name',
      'last_name',
      'title',
      'personal_email',
      'work_email',
      'personal_phone',
      'work_phone',
      'ext',
      'other_ext',
      'specialty_id',
      'subspecialty_id',
      'position_id'
    ]);
    const nameData = request.only(['isContact','hiring_authority_id']);
    const result = await CompanyRepository.createHiringAuthority(companyId, hiringAuthorityData, nameData.isContact ? nameData.hiring_authority_id : null);

    return response.status(result.code).send( result.success ? result.data : result )
   }


  /**
   * Reassign company
   * PUT or PATCH company/reassign/:id
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async reassign({ params, auth, request, response }) {
    const companyId = params.id;
    const recruiterId = request.input('recruiterId');
    const result = await CompanyRepository.assignToRecruiter(companyId, recruiterId, auth.current.user.id);
    return response.status(result.code).send(result.success ? result.data : result);
  }

  /**
   * Company Assigment History
   * GET company/getAssignmentHistory/:id

*/
  async getAssignmentHistory({params, response}) {
    const companyId = params.id;
    const result = await CompanyRepository.getAssignationHistory(companyId);
    return response.status(result.code).send(result.data);
  }
     /**
   * Create Fee Agreement
   *
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
   async storeFeeAgreement({request, params, response, auth}){
    const companyId = params.id;
    const data = request.all();
    const userId = auth.current.user.id;
    data.creator_id = userId;
    try {
      const result = await CompanyRepository.createFeeAgreementFromProfile(companyId, userId, data);

      return response.status(result.code).send( result.success ? result.data : result )
    } catch(error) {
      appInsights.defaultClient.trackException({exception: error});

      return response.status(error.code ? error.code : 500).send({
        message: error.message || 'There was a problem storing the fee agreement'
      });
    }

   }

  /**
   * Assign Hiring
   * POST company/:id/hiring-authorities/:hiringAuthorityId
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async updateAndAssignHiringAuthority({ params, auth, request, response }) {
    const companyId = params.id;
    const hiringAuthorityId = params.hiringAuthorityId;
    const hiringDataToUpdate = request.only(['position_id','specialty_id','subspecialty_id']);
    const result = await CompanyRepository.updateAndAssignHiringAuthority(hiringDataToUpdate,hiringAuthorityId,companyId);
    return response.status(result.code).send(result.success ? result.data : result);
  }

  /**
   * Remove Hiring from Company
   * DELETE company/:id/hiring-authorities/:hiringAuthorityId
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async deleteHiringAuthority({ params, response}) {
    const companyId = Number(params.id);
    const hiringAuthorityId = Number(params.hiringAuthorityId);
    const result = await CompanyRepository.deleteHiringAuthority(hiringAuthorityId, companyId);
    return response.status(result.code).send(result.success ? result.data : result);
  }


     /**
   * Get hiring Authorities by CompanyId.
   * GET /:id/hiring-authorities
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   * @param {View} ctx.view
   */
  async hiringAuthorities({ params, response }) {
    const companyId = params.id;
    const result = await CompanyRepository.hiringAuthorities(companyId);
    return response.status(result.code).send(result.success ? result.data : result);
  }


  /**
   * Get Fee Agreements by CompanyId.
   * GET /:id/fee-agreements
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   * @param {View} ctx.view
   */
  async getFeeAgreements({params, response}) {
    try {
      const companyId = params.id;
      const result = await CompanyRepository.getFeeAgreements(companyId);
      return response.ok(result);
    } catch(error) {
      appInsights.defaultClient.trackException({exception: error});
      return response.status(error.code ? error.code : 500).send({
        message: error.message || 'There was a problem getting fee agreements'
      });
    }
  }
    /**
   * Get Job orders by CompanyId.
   * GET /:id/fee-agreements
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   * @param {View} ctx.view
   */
  async getJobOrders({params, response}) {
    try {
      const companyId = params.id;
      const result = await CompanyRepository.getJobOrders(companyId);
      return response.ok(result);
    } catch(error) {
      appInsights.defaultClient.trackException({exception: error});
      return response.status(500).send({
        message: error.message || 'There was a problem getting fee agreements'
      });
    }
  }

   /**
   * Get duplicates companies by filters.
   * GET /duplicates
   */
  async getDuplicates({ request, response }) {
    const filters = request.only([
      'cityId',
      'column',
      'direction',
      'industryId',
      'orderBy',
      'page',
      'perPage',
      'specialtyId',
      'stateId',
      'subspecialtyId'
    ]);
    const result = await CompanyRepository.getDuplicates(filters);
    return response.status(result.code).send(result.success ? result.data : result);
  }

   /**
   * Get Company types
   * GET /types
   *
   * */

  async getCompanyTypes({response}) {
    try {
      const result = await CompanyRepository.getCompanyTypes();
      return response.ok(result);
    } catch(error) {
      appInsights.defaultClient.trackException({exception: error});
        return response.status(500).send({
        message: error.message || 'There was a problem getting company types'
      });
    }
  }

  /**
   * Upload File.
   * POST companies/files/
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   * @param {View} ctx.view
   */
  async storeFile({ auth, request, params, response }) {
    const company = await Company.find(params.id);
    const user_id = auth.current.user.id;
    if (!company) {
      return response.send({
        success: false,
        code: 404,
        message: { error: 'Company not Found' },
      });
    }
    try {
      request.multipart.file('file', getMultipartConfig, async (file) => {
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
        const companyFile = await CompanyHasFile.create({
          company_id: company.id,
          file_type_id: await fileType('ATTACHMENT'),
          url: absolutePath,
          file_name: `${originalName}.${file.extname}`,
          created_by: user_id
        });
        company.merge({updated_by:  user_id});
        await company.save();
        Event.fire(EventTypes.Company.FileCreated, {
          companyId: params.id,
          entity: EntityTypes.File,
          operation: OperationType.Create,
          payload: {
            description: 'Attachment created',
            companyId: params.id,
            userId: user_id,
            fileId: companyFile.id,
            companyFile,
          },
          userId: user_id,
        });
        return response.status(201).send(companyFile);
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
   * Merge duplicated companies.
   * POST /duplicates/merge
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async mergeDuplicated({ request, response }) {
    const { masterId, selectedIds } = request.only(['masterId','selectedIds'])
    const result = await CompanyRepository.mergeDuplicated(masterId,selectedIds);
    return response.status(result.code).send(result);
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
      const company = await Company.find(params.id);
      const companyFile = await CompanyHasFile.query()
        .where('id', params.fileId)
        .where('company_id', params.id)
        .first();
      if (!companyFile) {
        return response.status(404).send({
          message: 'File not found',
        });
      }
      if (companyFile.created_by != user_id) {
        return response.status(403).send({
          message: 'Only attachment owner can delete',
        });
      }

      const isReassureAttachment = await CompanyTypeReassure.query()
        .where('company_has_file_id', companyFile.id)
        .first();
      if (isReassureAttachment) {
        isReassureAttachment.merge({ company_has_file_id: null });
        await isReassureAttachment.save();
      }

      await deleteServerFile(companyFile.url);
      await companyFile.delete();
      await company.merge({ updated_by: user_id });
      await company.save();

      Event.fire(EventTypes.Company.FileDeleted, {
        companyId: params.id,
        entity: EntityTypes.File,
        operation: OperationType.Delete,
        payload: {
          description: 'Attachment destroyed',
          companyId: params.id,
          userId: user_id,
          fileId: params.fileId,
          companyFile,
        },
        userId: user_id,
      });

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
   * Create Unmanaged Fee Agreement
   *
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async createUnManagedFeeAgreement({request, params, response, auth}){
    const companyId = params.id;
    const data = request.all();
    const userId = auth.current.user.id;
    data.creator_id = userId;
    try {
      const feeAgreement = await CompanyRepository.createUnManagedFeeAgreement(companyId, userId, data);

      return response.status(201).send(feeAgreement);
    } catch(error) {
      appInsights.defaultClient.trackException({exception: error});

      return response.status(500).send({
        message: 'There was a problem storing the fee agreement'
      });
    }
  }


   /**
   * Get Company Files
   * GET /:id/files
   * */
  async getFiles({ response, params }) {
    try {
      const result = await CompanyRepository.getFiles(params.id);
      return response.ok(result);
    } catch(error) {
      appInsights.defaultClient.trackException({exception: error});
        return response.status(500).send({
          message:  Antl.formatMessage('messages.error.internalServer', {
            action: 'retrieving',
            entity: 'company files',
          }),
      });
    }
  }
}

module.exports = CompanyController;
