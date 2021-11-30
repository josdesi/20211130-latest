'use strict';

/** @typedef {import('@adonisjs/framework/src/Request')} Request */
/** @typedef {import('@adonisjs/framework/src/Response')} Response */
/** @typedef {import('@adonisjs/framework/src/View')} View */

//Utils
const appInsights = require('applicationinsights');
const { auditFields, nameTypes, nameStatus } = use('App/Helpers/Globals');
const { uploadFile, deleteServerFile, getMultipartConfig } = use('App/Helpers/FileHelper');
const {multipleFilterParser, defaultWhereResolver, multipleWhereResolver, positionFilterResolver} = (use('App/Helpers/QueryFilteringUtil'));
const { fileType } = use('App/Helpers/FileType');
const Database = use('Database');
const path = require('path');

//Models
const NameType = use('App/Models/NameType');
const CandidateType = use('App/Models/CandidateType');
const HiringAuthorityStatus = use('App/Models/HiringAuthorityStatus');
const NameStatus = use('App/Models/NameStatus');
const NameHasFile = use('App/Models/NameHasFile');
const Name = use('App/Models/Name');

//Repositories
const NameRepository = new (use('App/Helpers/NameRepository'))();

/**
 * Resourceful controller for interacting with names
 */
class NameController {

  constructor() {

    this._orderColumnsMap = {
      'full_name': 'full_name',
      'functional_title': 'functional_title',
      'specialty_title': 'specialty_title',
      'title': 'title',
      'added_date': 'added_date',
      'item_type': 'item_type',
      'current_company': 'current_company',
      'role': 'role',
      'type': 'type',
      'status': 'status',

      'country': 'country',
      'state': 'state',
      'city': 'city',
      'location': 'location',
      'zip': 'zip',

      'last_activity_date': 'last_activity_date',
    };

    const buildDefaultMultipleFilterEntry = (column) => ({
      resolver: multipleWhereResolver.bind(this),
      column,
      parser: multipleFilterParser
    });
    const bindedDefaultWhereResolver = defaultWhereResolver.bind(this);

    this._filterOptionsColumnMap = {
      roleId: {resolver: bindedDefaultWhereResolver, column: 'nm.role_id'},
      //typeId: {resolver: bindedDefaultWhereResolver, column: 'nm.type_id'},
      statusId: {resolver: bindedDefaultWhereResolver, column: 'nm.status_id'},

      countryId: {resolver: bindedDefaultWhereResolver, column: 'nm.country_id'},
      stateId: {resolver: bindedDefaultWhereResolver, column: 'nm.state_id'},
      cityId: {resolver: bindedDefaultWhereResolver, column: 'nm.city_id'},
      zip: {resolver: bindedDefaultWhereResolver, column: 'nm.zip'},

      nameTypeId: {resolver: bindedDefaultWhereResolver, column: 'nm.role_id'},
      nameStatusId: {resolver: bindedDefaultWhereResolver, column: 'nm.name_status_id'},
      positionId: {resolver: bindedDefaultWhereResolver, column: 'nm.position_id'},
      specialtyId: {resolver: bindedDefaultWhereResolver, column: 'nm.specialty_id'},
      subspecialtyId: {resolver: bindedDefaultWhereResolver, column: 'nm.subspecialty_id'},
      industryId: {resolver: bindedDefaultWhereResolver, column: 'nm.industry_id'},
      companyId: {resolver: bindedDefaultWhereResolver, column: 'company_id'},
      companyTypeId: {resolver: bindedDefaultWhereResolver, column: 'company_type_id'},
      recruiterId: {resolver: bindedDefaultWhereResolver, column: 'recruiter_id'},


      //roleIds: buildDefaultMultipleFilterEntry('nm.role_id'),
      //typeIds: buildDefaultMultipleFilterEntry('nm.type_id'),
      //statusIds: buildDefaultMultipleFilterEntry('nm.status_id'),

      countryIds: buildDefaultMultipleFilterEntry('nm.country_id'),
      stateIds: buildDefaultMultipleFilterEntry('nm.state_id'),
      cityIds: buildDefaultMultipleFilterEntry('nm.city_id'),
      radius: {resolver: this.applyRadiusFilter.bind(this), column: 'nm.coordinates'},

      //nameTypeIds: buildDefaultMultipleFilterEntry('nm.role_id'),
      //nameStatusIds: buildDefaultMultipleFilterEntry('nm.type_id'),
      positionIds: { column: 'position_id', resolver: positionFilterResolver, parser: multipleFilterParser},
      specialtyIds: buildDefaultMultipleFilterEntry('nm.specialty_id'),
      subspecialtyIds: buildDefaultMultipleFilterEntry('nm.subspecialty_id'),
      industryIds: buildDefaultMultipleFilterEntry('nm.industry_id'),
      companyIds: buildDefaultMultipleFilterEntry('company_id'),
      companyTypeIds: buildDefaultMultipleFilterEntry('company_type_id'),
      recruiterIds: buildDefaultMultipleFilterEntry('recruiter_id'),

    };

    this.customFilters = [
      { applier: this.applyNameEntityTypeFilters.bind(this), requiredValues: ['typeIds', 'statusIds', 'roleIds'] }
    ];
  }
  /**
   * Show a list of all names.
   * GET names
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   * @param {View} ctx.view
   */
  async index({ request, response }) {
    try {
      const names = await this.listingQuery(request.all())
      return response.status(200).send(names);
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
      return response.status(500).send({
        message: 'There was a problem retrieving all the names, please try again later'
      });
    }
  }

  /**
   * The logic behind the index was modularized here, while I wanted to put this in the repository, it seems that that applywhereclause is
   *  deeply rooted to be here, in the controller, and fixing it will take time
   * GET names
   *
   * @method names
   *
   * @param {object} queryParams - Contains everything passed as query params from the get requestes
   *
   * @return {Object} A pagination object
   */
  async listingQuery(queryParams){
    const { page = 1, perPage = 10, orderBy, direction, keyword } = queryParams;
    let query = Database.table('contacts_directory as nm');
    query
      .select([
        'nm.origin_table_id as id',
        'nm.created_at as added_date',
        'nm.full_name',
        'nm.title',
        'nm.position as functional_title',
        'company as current_company',
        'nm.company_id',
        'role_id',
        'role',
        'type_id',
        'type',
        'type_color',
        'status',
        'status_id',
        'status_color',
        'country',
        'state',
        'city',
        'zip',
        'location',
        'industry_specialty as specialty_title',
        'industry',
        'specialty',
        'subspecialty',
        Database.raw(`json_build_object('id', company_type_id, 'title', company_type, 'color', company_type_color) as company_type`),
        'recruiter_id',
        'recruiter_name',
        'phone',
        'mobile',
        Database.raw("json_build_object('phone', coalesce(phone, mobile), 'email', coalesce(email, personal_email)) as communication_actions"),
        'last_activity_date',
        'last_activity_recruiter',
        'last_activity_title',
      ]);

    this.applyKeywordClause(keyword, query);
    await this.applyWhereClause(queryParams, query);
    this.applyOrderClause(orderBy, direction, query);
    const names = await query.paginate(page, perPage);

    return names;
  }

  /**
  * Return the where clause to apply on the query.
  * GET where clause
  *
  * @param {Request} ctx.request
  */
  applyKeywordClause(keyword, query) {
    if (keyword) {
      query.where('nm.searchable_text', 'ilike', `%${keyword}%`);
    }
  }

  /**
   * Return the where clause to apply on the query.
   * GET where clause
   *
   * @param {object} queryParams - Contains everything passed as query params from the get requestes
   * @param {Knex} query - The query used in the indexing
   */
  async applyWhereClause(queryParams, query) {
    const filters = this.extractListingFilters(queryParams);
    const filtersToEvaluate = Object.keys(filters);
    for(const keyFilter of filtersToEvaluate) {
      const filterMapEntry = this._filterOptionsColumnMap[keyFilter];
      if (!filterMapEntry) continue;
      const {resolver, column, parser} = filterMapEntry;
      const value = (parser instanceof Function) ? parser(filters[keyFilter]) : filters[keyFilter];
      if (!value || !(resolver instanceof Function)) continue;
      await resolver({query, column, value});
    }

    for(const customFilter of this.customFilters) {
      const { applier, requiredValues } = customFilter;
      if (!(applier instanceof Function)) continue;
      const parameters = {
        query
      };
      if (Array.isArray(requiredValues) && requiredValues.length > 0) {
        for(const requiredValue of requiredValues) {
          parameters[requiredValue] = filters[requiredValue];
        }
      }
      await applier(parameters);
    }
  }

  /**
   * Returns an object only with the valid listing filters.
   *
   * @param {object} queryParams - Contains everything passed as query params from the get requestes
   * @return {object} listingFilters - Only the f
   */

  extractListingFilters = ({
    nameTypeId,
    nameStatusId,
    positionId,
    specialtyId,
    subspecialtyId,
    industryId,
    companyId,
    companyTypeId,
    typeId,
    roleId,
    statusId,
    recruiterId,

    nameTypeIds,
    nameStatusIds,
    positionIds,
    specialtyIds,
    subspecialtyIds,
    industryIds,
    companyIds,
    companyTypeIds,
    typeIds,
    roleIds,
    statusIds,
    recruiterIds,

    countryIds,
    stateIds,
    cityIds,
    zips,
    radius
  }) => ({
    nameTypeId,
    nameStatusId,
    positionId,
    specialtyId,
    subspecialtyId,
    industryId,
    companyId,
    companyTypeId,
    typeId,
    roleId,
    statusId,
    recruiterId,

    nameTypeIds,
    nameStatusIds,
    positionIds,
    specialtyIds,
    subspecialtyIds,
    industryIds,
    companyIds,
    companyTypeIds,
    recruiterIds,
    typeIds: multipleFilterParser(typeIds),
    roleIds: multipleFilterParser(roleIds),
    statusIds: multipleFilterParser(statusIds),

    countryIds,
    stateIds,
    cityIds,
    zips,
    radius: {radius, zips: multipleFilterParser(zips)}
  });

  /**
   * Return the order clause to apply on the query.
   * GET order clause
   *
   * @param {Request} ctx.request
   */
  applyOrderClause(orderBy, direction, query) {
    const validDirections = ['asc', 'desc'];

    const orderColumn = this._orderColumnsMap[orderBy] || this._orderColumnsMap['full_name'];
    const orderDirection = direction && validDirections.includes(direction.toLowerCase()) ? direction : validDirections[0];
    query.orderByRaw(`${orderColumn} ${orderDirection} NULLS LAST`);

  }

  async applyRadiusFilter({value, query}) {
    const {radius, zips} = value;
    const isRadiusValid = radius && !Number.isNaN(radius);
    const isZipValid = Array.isArray(zips) && zips.length > 0;
    if (!isRadiusValid && !isZipValid) return;
    if (isZipValid && !isRadiusValid) {
      query.whereIn('zip', zips);
      return;
    } else if(isRadiusValid && isZipValid) {
      const distance = radius * 1609.34;
      const zipsWithCoordinates = await Database.table('zip_codes').select(['longitude', 'latitude']).whereIn('zip_ch', zips);
      const rawSentences = zipsWithCoordinates.map((_, index) => `ST_DWithin(nm.coordinates, ST_MakePoint(:longitude_${index},:latitude_${index})::geography, :distance)`).join(' or ');
      const parametersMap = {distance};
      zipsWithCoordinates.forEach((value, index) => {
        parametersMap[`longitude_${index}`] = value.longitude;
        parametersMap[`latitude_${index}`] = value.latitude;
      })
      query.where(function() {
        this.whereRaw(`(${rawSentences})`, parametersMap).orWhereIn('zip', zips);
      })

    }

  }

  async applyNameEntityTypeFilters({query, typeIds, roleIds, statusIds}) {
    const isTypeIdsValid = typeIds && Array.isArray(typeIds) && typeIds.length > 0;
    const isRoleIdsValid = roleIds && Array.isArray(roleIds) && roleIds.length > 0;
    const isStatusIdsValid = statusIds && Array.isArray(statusIds) && statusIds.length > 0;
    const rolesImpliedByTypes = isTypeIdsValid ?
      (await Database.from('name_entity_types')
        .select(['id', 'name_type_id'])
        .whereIn('id', typeIds))
        : [];
    const rolesImpliedByStatuses = isStatusIdsValid ?
    (await Database.from('name_statuses')
      .select(['id', 'name_type_id'])
      .whereIn('id', statusIds))
      : [];

    const allImpliedRoles = [...new Set([...rolesImpliedByStatuses.map(({name_type_id}) => name_type_id), ...rolesImpliedByTypes.map(({name_type_id}) => name_type_id)])];

    const allImpliedRolesInString = allImpliedRoles.map(id => `${id}`);
    const typesByImpliedRoleMap = {};
    rolesImpliedByTypes.forEach(({id, name_type_id}) => {
      if (!typesByImpliedRoleMap[name_type_id]) typesByImpliedRoleMap[name_type_id] = [];
      typesByImpliedRoleMap[name_type_id].push(id);
    });

    const statusByImpliedRoleMap = {};
    rolesImpliedByStatuses.forEach(({id, name_type_id}) => {
      if (!statusByImpliedRoleMap[name_type_id]) statusByImpliedRoleMap[name_type_id] = [];
      statusByImpliedRoleMap[name_type_id].push(id);
    })
    const roleIdsMap = {};
    allImpliedRoles.forEach((roleId) => {
      roleIdsMap[`role_id_${roleId}`] = roleId;
    });

    const queryTemplates = [];
    const statusIdsMap = {};
    const typeIdsMap = {};
    const standaloneRolesMap = {};
    if (isRoleIdsValid) {
      const standaloneRoles = roleIds.map(role => `${role}`).filter(role => !allImpliedRolesInString.includes(role));
      standaloneRoles.forEach((role) => {
        standaloneRolesMap[`standalone_role_${role}`] = role;
        queryTemplates.push(`(role_id = :standalone_role_${role} or status_id = :standalone_role_${role})`);
      });
    }

    if (isTypeIdsValid) {
      for(const impliedRole of allImpliedRoles) {
        const currentTypes = typesByImpliedRoleMap[impliedRole];
        if (!Array.isArray(currentTypes)) continue;
        const typeIdsTemplate = `(${currentTypes.map((_, index) => `:type_${impliedRole}_${index}`).join(',')})`;
        currentTypes.forEach((typeId, index) => {
          typeIdsMap[`type_${impliedRole}_${index}`] = typeId;
        });
        queryTemplates.push(`(role_id = :role_id_${impliedRole} and type_id in ${typeIdsTemplate})`);
      }
    }

    if (isStatusIdsValid) {
      for(const impliedRole of allImpliedRoles) {
        const currentStatuses = statusByImpliedRoleMap[impliedRole];
        if (!Array.isArray(currentStatuses)) continue;
        const statusIdsTemplate = `(${currentStatuses.map((_, index) => `:status_${impliedRole}_${index}`).join(',')})`;
        currentStatuses.forEach((statusId, index) => {
          statusIdsMap[`status_${impliedRole}_${index}`] = statusId;
        });
        queryTemplates.push(`(role_id = :role_id_${impliedRole} and status_id in ${statusIdsTemplate})`);
      }
    }

    const statusIdsInString = isStatusIdsValid ? statusIds.map(id => `${id}`) : [];
    if (allImpliedRolesInString.includes(`${nameTypes.Candidate}`) && (statusIdsInString.includes(`${nameStatus.Candidate.Ongoing}`) || statusIdsInString.includes(`${nameStatus.Candidate.Unqualified}`) )) {
      queryTemplates.push(`(status_id = :status_candidate_${nameStatus.Name.Candidate} )`)

      standaloneRolesMap[`status_candidate_${nameStatus.Name.Candidate}`] =  nameStatus.Name.Candidate;
    }


    if (queryTemplates.length == 0) {
      return;
    }

    const rolesQuery = `${queryTemplates.join(' or ')}`;
    query.whereRaw(`(${rolesQuery})`, {...roleIdsMap, ...statusIdsMap, ...typeIdsMap, ...standaloneRolesMap});


  }

  /**
   * Create/save a new name.
   * POST names
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async store({ auth, request, response }) {
    const companyId = request.input('company_id');
    const result = await NameRepository.create(request, auth.current.user.id, companyId);

    return response.status(result.code).send(result);
  }

  /**
   * Creates a Name's Employer Company.
   * POST name/:id/employer-company
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
      const nameId = Number(params.id);
      const companyId = request.input('company_id');

      const result = await NameRepository.addNewCompanyEmployerRelation(
        nameId,
        companyId,
        auth.current.user.id,
      );

      return response.status(result.code).send(result.success ? result.data : result);
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
      return response
        .status(500)
        .send({ success: false, message: "Something went wrong while creting the name's employer"});
    }
  }

  /**
   * Display a single name.
   * GET names/:id
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   * @param {View} ctx.view
   */
  async show({ request, params, auth, response }) {
    try {
      const userId = auth.current.user.id;
      const { onlyBasicInfo = false } = request.only(['onlyBasicInfo'])

      const name = await NameRepository.details(params.id, onlyBasicInfo, userId);
      if (!name) {
        return response.status(404).send({
          message: 'Name Not Found'
        });
      }
      return response.status(200).send(name);
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
      return response.status(500).send({
        message: 'There was a problem retrieving the name profile, please try again later'
      });
    }
  }

  /**
   * Display a list of suggested companies.
   * GET names/:id/suggested-companies
   *
   * @param {object} ctx
   * @param {Response} ctx.response
   *
   * @return {Object} Response with the name object or an error
   */
  async indexSuggestedCompanies({ params, request, response }) {
    try {
      const limit = request.input('limit');

      const result = await NameRepository.getSuggestedCompanies(params.id, limit);

      return response.status(result.code).send(result.success ? result.data : result);
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
      return response.status(500).send({
        message: 'There was a problem while retrieving the suggested companies',
      });
    }
  }

  /**
   * Update name details.
   * PUT or PATCH names/:id
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async update({ auth, params, request, response }) {
    const companyId = request.input('company_id');

    const result = await NameRepository.update(params.id, request, auth.current.user.id, companyId);

    return response.status(result.code).send(result.data || result);
  }

  /**
   * Show a list of all names.
   * GET names/types
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   * @param {View} ctx.view
   */
  async types({ response }) {
    try {
      const results = await NameType.query().setHidden(auditFields).orderBy('id').where('id', '!=', nameTypes.Name).fetch();

      return response.ok(results);
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      return response.status(500).send({
        message: 'There was a problem geeting the name types, please try again later',
      });
    }
  }


  /**
   * Create/save a new name activity log.
   * POST names/:id/activityLogs
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async storeActivityLog({ auth, request, response, params }) {
    const { body, activity_log_type_id } = request.only(['body', 'activity_log_type_id']);
    const result = await NameRepository.createActivityLog(body, activity_log_type_id, params.id, auth.current.user.id);

    return response.status(result.code).send(result);
  }

  /**
   * Create/save a new external name activity log.
   * POST names/:id/external/activityLogs
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

    const result = await NameRepository.createActivityLog(
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
   * POST names/:nameId/activityLogs/:id
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async updateActivityLog({ auth, request, response, params }) {
    const result = await NameRepository.updateActivityLog(request.all(), params.id, auth.current.user.id);

    return response.status(result.code).send(result.data || result);
  }

  /**
  * Destroy a name activity log.
  * Delete names/:nameId/activityLogs/:id
  *
  * @param {object} ctx
  * @param {Request} ctx.request
  * @param {Response} ctx.response
  */
  async destroyActivityLog({ auth, response, params }) {
    const result = await NameRepository.deleteActivityLog(params.id, auth.current.user.id);

    return response.status(result.code).send(result);
  }

  /**
 * Create/save a new name note.
 * POST names/:id/notes
 *
 * @param {object} ctx
 * @param {Request} ctx.request
 * @param {Response} ctx.response
 */
  async storeNote({ auth, request, response, params }) {
    const result = await NameRepository.createNote(request.all(), params.id, auth.current.user.id);

    return response.status(result.code).send(result);
  }

  /**
* Update a  name  note.
* POST names/:nameId/notes/:id
*
* @param {object} ctx
* @param {Request} ctx.request
* @param {Response} ctx.response
*/
  async updateNote({ auth, request, response, params }) {
    const result = await NameRepository.updateNote(request.all(), params.id, auth.current.user.id);

    return response.status(result.code).send(result.data || result);
  }


  /**
* Destroy a name note.
* Delete names/:nameId/notes/:id
*
* @param {object} ctx
* @param {Request} ctx.request
* @param {Response} ctx.response
*/
  async destroyNote({ auth, response, params }) {
    const result = await NameRepository.deleteNote(params.id, auth.current.user.id);

    return response.status(result.code).send(result);
  }

  /**
 * Upload File.
 * POST name/files/
 *
 * @param {object} ctx
 * @param {Request} ctx.request
 * @param {Response} ctx.response
 */
  async storeFile({ auth, request, params, response }) {
    const name = await Name.find(params.id);
    if (!name) {
      return response.status(404).send({
        message: 'Name record not Found'
      });
    }
    try {
      request.multipart.file('file', getMultipartConfig(), async file => {
        await file.runValidations();
        const error = file.error();
        if (error.message) {
          return response.status(400).send({
            message: error.message
          });
        }
        const originalName = path.parse(file.clientName).name
        const fileName = `${originalName}-${new Date().getTime()}.${file.extname}`;
        const absolutePath = await uploadFile('attachments/' + fileName, file.stream);
        if (!absolutePath) {
          return response.status(500).send({
            message: 'There was a problem uploading the file , please try again later!'
          });
        }
        const nameFile = await NameHasFile.create(
          {
            name_id: name.id,
            file_type_id: fileType('ATTACHMENT'),
            url: absolutePath,
            file_name: `${originalName}.${file.extname}`
          }
        );
        await name.merge({ updated_by: auth.current.user.id });
        await name.save();
        return response.status(201).send(nameFile);
      });
      await request.multipart.process();
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
      return response.status(500).send({
        message: 'There was a problem uploading the file, please try again later'
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
      const nameFile = await NameHasFile.query()
        .where('id', params.fileId)
        .where('name_id', params.id)
        .first();
      if (!nameFile) {
        return response.status(404).send({
          message: 'File not found'
        });
      }
      const name = await Name.find(params.id);
      await deleteServerFile(nameFile.url)
      await nameFile.delete();
      await name.merge({ updated_by: auth.current.user.id });
      await name.save();
      return response.status(200).send({
        message: 'The file was deleted succesfully!'
      });
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      return response.status(500).send({
        message: 'There was a problem deleting the file, please try again later'
      });
    }

  }

  /**
 * Show a list of all statuses.
 * GET names/statuses/byNameType/:id
 *
 * @param {object} ctx
 * @param {Request} ctx.request
 * @param {Response} ctx.response
 * @param {View} ctx.view
 */
  async statusesByNameType({ params, response }) {
    try {
      const name_type_id = Number(params.id);
      let query;
      switch (name_type_id) {
        case nameTypes.Name:
          query = NameStatus.query();
          break;
        case nameTypes.Candidate:
          query = CandidateType.query();
          break;
        case nameTypes.HiringAuthority:
          query = HiringAuthorityStatus.query();
          break;
        default:
          return response.status(400).send({
            message: `${params.id} is not a valid name type id`,
          });
      }

      const result = await query
        .setHidden(auditFields)
        .orderBy('id')
        .fetch();

      return response.ok(result);
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      return response.status(500).send({
        message: 'There was a problem geeting the name statuses, please try again later',
      });
    }
  }

  /**
* Show a list of all statuses.
* GET names/statuses
*
* @param {object} ctx
* @param {Request} ctx.request
* @param {Response} ctx.response
* @param {View} ctx.view
*/
  async statuses({ response, request }) {
    try {
      const nameTypeId = request.input('nameTypeId');
      const query = NameStatus.query();
      if (nameTypeId) {
        query.where('name_type_id', nameTypeId)
      }
      const nameStatuses = await query.setHidden(auditFields).orderBy('id').fetch();

      return response.ok(nameStatuses);
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      return response.status(500).send({
        message: 'There was a problem geeting the name statuses, please try again later',
      });
    }
  }

  /**
* Show a list of all names that are not converted
* GET names/byNotType
*
* @param {object} ctx
* @param {Request} ctx.request
* @param {Response} ctx.response
* @param {View} ctx.view
*/
  async getAavailableNames({ request, response }) {
    const { limit, keyword } = request.all();
    try {
      let query = Database.table('names as nm');
      query
        .select([
          'nm.origin_table_id',
          'pi.full_name',
          'pst.title as functional_title',
        ])
        .innerJoin('personal_informations as pi', 'nm.personal_information_id', 'pi.id')
        .leftJoin('positions as pst', 'nm.position_id', 'pst.id')
        .whereRaw('convertion_date is null')
        .orderBy('pi.full_name');

      if (keyword) {
        query.where(function () {
          this.where('pi.full_name', 'ilike', `%${keyword}%`)
            .orWhere('pst.title', 'ilike', `%${keyword}%`);
        });
      }
      limit ? query.limit(limit) : null
      const names = await query;
      return response.status(200).send(names);
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
      return response.status(500).send({
        message: 'There was a problem retrieving all the names, please try again later'
      });
    }
  }

  async groupedTypesByRole({request, response}) {
    try {
      const nameEntityTypes = await Database
        .from('name_entity_types')
        .select([
          'name_entity_types.id as id',
          'name_entity_types.name_type_id',
          'name_types.title as name_type_title',
          'name_entity_types.original_table_id',
          Database.raw('catype.title as title')
        ])
        .joinRaw(`LEFT JOIN candidate_types catype ON name_entity_types.original_table_id = catype.id AND name_entity_types.name_type_id = ${nameTypes.Candidate}`)
        .join('name_types', 'name_types.id', 'name_entity_types.name_type_id');
      return nameEntityTypes;
    } catch(error) {
      appInsights.defaultClient.trackException({ exception: error });
      return response.status(500).send({
        message: 'There was a problem retrieving all the names, please try again later'
      });
    }
  }

  async groupedStatusByRole({request, response}) {
    try {
      const nameStatuses = await Database
        .from('name_statuses')
        .select([
          'name_statuses.id as id',
          'name_statuses.name_type_id',
          'name_types.title as name_type_title',
          'name_statuses.original_table_id',
          Database.raw('COALESCE(castatus.title, nm_status.title, ha_status.title) as title')
        ])
        .whereNot('name_statuses.id', nameStatus.Name.Undefined)
        .join('name_types', 'name_types.id', 'name_statuses.name_type_id')
        .joinRaw(`LEFT JOIN candidate_statuses castatus ON name_statuses.original_table_id = castatus.id AND name_statuses.name_type_id = ${nameTypes.Candidate}`)
        .joinRaw(`LEFT JOIN hiring_authority_statuses ha_status ON name_statuses.original_table_id = ha_status.id AND name_statuses.name_type_id = ${nameTypes.HiringAuthority}`)
        .joinRaw(`LEFT JOIN name_statuses nm_status ON nm_status.id = name_statuses.id`)
        .whereNotIn('name_statuses.name_type_id', [nameTypes.Name, nameTypes.HiringAuthority]);
        return nameStatuses;
    } catch(error) {
      appInsights.defaultClient.trackException({ exception: error });
      return response.status(500).send({
        message: 'There was a problem retrieving all the names, please try again later'
      });
    }
  }


}

module.exports = NameController;
