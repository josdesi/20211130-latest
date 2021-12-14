'use strict';

//Models
const SearchProject = use('App/Models/SearchProject');
const SearchProjectCandidate = use('App/Models/SearchProjectCandidate');
const SearchProjectHiringAuthority = use('App/Models/SearchProjectHiringAuthority');
const SearchProjectName = use('App/Models/SearchProjectName');

//Repositories
const SearchProjectRepository = new (use('App/Helpers/SearchProjectRepository'))();
const UserRepository = new (use('App/Helpers/UserRepository'))();

//Utils
const appInsights = require('applicationinsights');
const Database = use('Database');
const { SearchProjectTypes, nameStatus, userRoles, OperationType, EntityTypes, nameTypes } = use('App/Helpers/Globals');
const { multipleFilterParser, defaultWhereResolver, multipleWhereResolver, positionFilterResolver, applyOrderClause } =
  use('App/Helpers/QueryFilteringUtil');
const { searchProjectItemTypeResolver, searchProjectItemStatusResolver } = use('App/Helpers/SearchProjectQueryUtils');
const Event = use('Event');
const EventTypes = use('App/Helpers/Events');
const Antl = use('Antl');
const { pick } = use('lodash');

class SearchProjectInventoryRepository {
  constructor() {
    const buildDefaultWhereFilterEntry = (column) => ({
      resolver: defaultWhereResolver.bind(this),
      column,
    });
    const buildDefaultMultipleFilterEntry = (column) => ({
      resolver: multipleWhereResolver.bind(this),
      column,
      parser: multipleFilterParser,
    });

    this._filterOptionsColumnMap = {
      specialtyId: buildDefaultWhereFilterEntry('specialty_id'),
      subspecialtyId: buildDefaultWhereFilterEntry('subspecialty_id'),
      stateId: buildDefaultWhereFilterEntry('state_id'),
      cityId: buildDefaultWhereFilterEntry('city_id'),
      itemSearchProjectType: { column: 'item_search_project_type', resolver: searchProjectItemTypeResolver },
      companyTypeId: buildDefaultWhereFilterEntry('company_type_id'),
      statusId: { column: 'status_id', resolver: searchProjectItemStatusResolver },
      positionId: buildDefaultWhereFilterEntry('position_id'),

      positionIds: { column: 'position_id', resolver: positionFilterResolver, parser: multipleFilterParser },
      companyTypeIds: buildDefaultMultipleFilterEntry('company_type_id'),
      specialtyIds: buildDefaultMultipleFilterEntry('specialty_id'),
      subspecialtyIds: buildDefaultMultipleFilterEntry('subspecialty_id'),
      stateIds: buildDefaultMultipleFilterEntry('state_id'),
      cityIds: buildDefaultMultipleFilterEntry('city_id'),
      itemSearchProjectTypes: {
        column: 'item_search_project_type',
        resolver: searchProjectItemTypeResolver,
        parser: multipleFilterParser,
      },
      statusIds: { column: 'status_id', resolver: searchProjectItemStatusResolver, parser: multipleFilterParser },
    };

    this._orderColumnsMap = {
      item_search_project_type: 'item_search_project_type',
      status: 'status',
      full_name: 'full_name',
      email: 'email',
      specialty: 'specialty',
      subspecialty: 'subspecialty',
      location: 'location',
      created_at: 'created_at',
      position_title: 'position_title',
      company_type: 'company_type',
      current_company: 'current_company',
      last_activity_date: 'last_activity_date',
      state: 'state',
      city: 'city'
    };
  }

  /**
   * Show the properties of one research project
   *
   * @param {Request} req
   *
   * @return {Object} Search project details with a succes message or an error code
   *
   */
  async details(filters, paginationData, keyword = '', id, userId) {
    try {
      const { page = 1, perPage = 10, orderBy, direction } = paginationData;

      const { hasAtLeastOne: canManageSPs } = await UserRepository.hasRoles(userId, [userRoles.DataCoordinator]);
      const searchProject = await SearchProject.query()
        .where('id', id)
        .where(function () {
          if (!canManageSPs) this.where('is_private', false).orWhere('created_by', userId);
        })
        .first();

      if (!searchProject) {
        return {
          success: false,
          code: 404,
          message: 'Search project not found',
        };
      }

      const query = this.getSearchProjectItemsQuery(searchProject.id);

      this.applyKeywordClause(keyword, query);

      await this.applyWhereClause(filters, query);

      applyOrderClause({ column: orderBy, columnsMap: this._orderColumnsMap, query, direction });

      const result = await query.paginate(page, perPage);

      return {
        success: true,
        code: 200,
        data: result,
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
      return {
        success: false,
        code: 500,
        message: 'There was a problem retrieving the search projects details',
      };
    }
  }

  /**
   * Returns very basic information from one search project in specific
   *
   * @param {Request} req
   *
   * @return {Object} Search project details with a succes message or an error code
   *
   */
  async quickInfo(id, userId) {
    try {
      const { hasAtLeastOne: canManageSPs } = await UserRepository.hasRoles(userId, [userRoles.DataCoordinator]);
      const searchProject = await SearchProject.query()
        .select(
          'id',
          'name',
          Database.raw(
            'coalesce(ha_count.total::INTEGER, 0) + coalesce(candidates_count.total::INTEGER, 0) + coalesce(name_count.total::INTEGER, 0) as total_items'
          ),
          Database.raw('(CASE WHEN created_by = :userId THEN true ELSE false END) as is_mine', { userId })
        )
        .joinRaw(
          'left join (select search_project_id, count(*) as total from search_project_candidates group by search_project_id) as candidates_count on candidates_count.search_project_id = search_projects.id'
        )
        .joinRaw(
          'left join (select search_project_id, count(*) as total from search_project_hiring_authorities group by search_project_id) as ha_count on ha_count.search_project_id = search_projects.id'
        )
        .joinRaw(
          'left join (select search_project_id, count(*) as total from search_project_names group by search_project_id) as name_count on name_count.search_project_id = search_projects.id'
        )
        .where('id', id)
        .where(function () {
          if (!canManageSPs) this.where('is_private', false).orWhere('created_by', userId);
        })
        .first();

      if (!searchProject) {
        return {
          success: false,
          code: 404,
          message: 'Search project not found',
        };
      }

      const result = searchProject;

      return {
        success: true,
        code: 200,
        data: result,
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
      return {
        success: false,
        code: 500,
        message: 'There was a problem while retrieving the search projects information',
      };
    }
  }

  /**
   * Returns how many items one search project has
   *
   * @param {Number} searchProjectId
   * @summary This method returns the sum of candidates, ha & names that has one search projects
   *
   * @return {Object} bulk email created
   *
   */
  async getInventoryCount(searchProjectId) {
    return (
      Number(await SearchProjectCandidate.query().where('search_project_id', searchProjectId).getCount()) +
      Number(await SearchProjectHiringAuthority.query().where('search_project_id', searchProjectId).getCount()) +
      Number(await SearchProjectName.query().where('search_project_id', searchProjectId).getCount())
    );
  }

  /**
   * Return the inventory with details from one search project
   *
   * @param {Number} id
   * @param {Object} searchProjectSelection.params - The params that the search project will be applied to, allowing to select an specific output of the SP
   * @param {Object} searchProjectSelection.candidateIds - This contains the search project selected candidates
   * @param {Object} searchProjectSelection.hiringAuthorityIds - This contains the search project selected hirings
   * @param {Object} searchProjectSelection.nameIds - This contains the search project selected names
   */
  async getInventoryDetails(id, searchProjectSelection = {}, userId = null) {
    try {
      const searchProject = await SearchProject.query().where('id', id).first();

      if (!searchProject) {
        return {
          success: false,
          code: 404,
          message: 'Search project not found',
        };
      }

      const selectionItemIds = await this.getSearchProjectSelectionItemIds(searchProjectSelection, id, userId);

      const query = this.getSearchProjectItemsQuery(searchProject.id, selectionItemIds);

      const result = await query;

      return {
        success: true,
        code: 200,
        data: result,
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
      return {
        success: false,
        code: 500,
        message: 'There was a problem when retrieving the search projects inventory details',
      };
    }
  }

  /**
   * Query to get all project items in a union
   *
   * @param {Number} searchProjectId
   * @param {Number} itemSearchProjectType
   *
   * @return {Object} Search project inventory query
   *
   */
  getSearchProjectItemsQuery(searchProjectId, selectionItemIds = {}) {
    const { candidateIds = [], hiringAuthorityIds = [], nameIds = [] } = selectionItemIds;

    const candidatesQuery = this.getCandidatesQuery(searchProjectId, candidateIds);
    const haQuery = this.getHiringAuthorityQuery(searchProjectId, hiringAuthorityIds);
    const nameQuery = this.getNameQuery(searchProjectId, nameIds);

    const query = Database.select([
      'item.item_search_project_type',
      Database.raw(
        "CASE\
        WHEN item.item_search_project_type = :candidate THEN :candidateTitle\
        WHEN item.item_search_project_type = :ha THEN :haTitle\
        WHEN item.item_search_project_type in (:name, :nameCandidate, :nameHiringAuthority) THEN :nameTitle\
        ELSE 'Not Available'\
        END as item_search_project_title",
        {
          candidate: SearchProjectTypes.Candidate,
          ha: SearchProjectTypes.HiringAuthority,
          name: SearchProjectTypes.Name,
          nameCandidate: SearchProjectTypes.NameCandidate,
          nameHiringAuthority: SearchProjectTypes.NameHA,
          candidateTitle: 'Candidate',
          haTitle: 'Hiring Authority',
          nameTitle: 'Name',
        }
      ),
      'item.status',
      'item.status_id',
      'item.mobile',
      'item.phone',
      'item.id',
      'item.email',
      'item.full_name',
      'item.location',
      'item.state',
      'item.city',
      'item.specialty',
      'item.subspecialty',
      'item.created_at',
      'item.specialty_id',
      'item.subspecialty_id',
      'item.city_id',
      'item.state_id',
      'item.is_name',
      'item.current_company',
      'item.company_type_id',
      'item.company_type',
      'item.company_type_color',
      'item.position_title',
      'item.position_id',
      'item.searchable_text',
      'phone',
      'mobile',
      Database.raw("json_build_object('phone', coalesce(phone, mobile), 'email', email) as communication_actions"),
      'item.last_activity_date',
      'item.last_activity_recruiter',
      'item.last_activity_title',
    ]);

    query.from(Database.union(candidatesQuery, true).union(haQuery, true).union(nameQuery, true).as('item'));

    return query;
  }

  async getSearchProjectSelectionItemIds(searchProjectSelection = {}, searchProjectId, userId) {
    const selectionItemIds = { candidateIds: [], hiringAuthorityIds: [], nameIds: [] };

    if (!searchProjectSelection || Object.keys(searchProjectSelection).length <= 0) return selectionItemIds;

    const inventoryIds = await this.getInventoryByParams(searchProjectSelection, searchProjectId, userId);
    if (inventoryIds.success === false) throw inventoryIds;

    if (inventoryIds.candidates) selectionItemIds.candidateIds = inventoryIds.candidates;
    if (inventoryIds.ha) selectionItemIds.hiringAuthorityIds = inventoryIds.ha;
    if (inventoryIds.names) selectionItemIds.nameIds = inventoryIds.names;

    return selectionItemIds;
  }

  /**
   * Query to get the neccesaries candidates fields for the search project inventory query
   *
   * @param {Number} searchProjectId
   *
   * @return {Object} Candidate query
   *
   */
  getCandidatesQuery(searchProjectId, ids = []) {
    return Database.table('search_project_candidates as spcandidates')
      .select([
        Database.raw(':searchProjectType as item_search_project_type', {
          searchProjectType: SearchProjectTypes.Candidate,
        }),
        'item.status',
        'item.status_id',
        'item.phone',
        'item.mobile',
        'item.origin_table_id as id',
        'item.email',
        'item.full_name',
        'item.location',
        'item.state',
        'item.city',
        'item.specialty',
        'item.subspecialty',
        'item.specialty_id',
        'item.subspecialty_id',
        'item.city_id',
        'item.state_id',
        'item.company as current_company',
        'item.company_type_id',
        'item.company_type',
        'item.company_type_color',
        'item.position_id',
        'item.position as position_title',
        'item.searchable_text',
        Database.raw('false as is_name'),
        'spcandidates.created_at',
        'item.last_activity_date',
        'item.last_activity_recruiter',
        'item.last_activity_title',
      ])
      .joinRaw(
        'inner join contacts_directory as item on spcandidates.candidate_id = item.origin_table_id AND item.role_id = :candidate',
        { candidate: nameTypes.Candidate }
      )
      .where((builder) => {
        if (ids.length > 0) builder.whereIn('spcandidates.candidate_id', ids);
      })
      .where('spcandidates.search_project_id', searchProjectId)
      .orderBy('item.origin_table_id');
  }

  /**
   * Query to get the neccesaries Hiring Authorities fields for the search project inventory query
   *
   * @param {Number} searchProjectId
   *
   * @return {Object} Hiring Authority query
   *
   */
  getHiringAuthorityQuery(searchProjectId, ids = []) {
    return Database.table('search_project_hiring_authorities as spha')
      .select([
        Database.raw(':searchProjectType as item_search_project_type', {
          searchProjectType: SearchProjectTypes.HiringAuthority,
        }),
        'item.status',
        'item.status_id',
        'item.phone',
        'item.mobile',
        'item.origin_table_id as id',
        'item.email',
        'item.full_name',
        'item.location',
        'item.state',
        'item.city',
        'item.specialty',
        'item.subspecialty',
        'item.specialty_id',
        'item.subspecialty_id',
        'item.city_id',
        'item.state_id',
        'item.company as current_company',
        'item.company_type_id',
        'item.company_type',
        'item.company_type_color',
        'item.position_id',
        'item.position as position_title',
        'item.searchable_text',
        Database.raw('false as is_name'),
        'spha.created_at',
        'item.last_activity_date',
        'item.last_activity_recruiter',
        'item.last_activity_title',
      ])
      .joinRaw(
        'inner join contacts_directory as item on spha.hiring_authority_id = item.origin_table_id AND item.role_id = :ha',
        { ha: nameTypes.HiringAuthority }
      )
      .where((builder) => {
        if (ids.length > 0) builder.whereIn('spha.hiring_authority_id', ids);
      })
      .where('spha.search_project_id', searchProjectId)
      .orderBy('item.origin_table_id');
  }

  /**
   * Query to get the neccesaries Names fields for the search project inventory query
   *
   * @summary The names in a search project should be converted to candidates or hirings authorities, an array can be passed to return only one of those types, by default it returns all three
   *
   * @param {Number} searchProjectId
   * @param {Array} searchProjectTypes
   *
   * @return {Object} Hiring Authority query
   *
   */
  getNameQuery(searchProjectId, ids = []) {
    return Database.table('search_project_names as spnames')
      .select([
        Database.raw(
          'CASE \
          WHEN item.status_id = :nameUndefined THEN :searchProjectTypeUndefined \
          WHEN item.status_id = :nameCandidate THEN :searchProjectTypeCandidate \
          WHEN item.status_id = :nameHiringAuthority THEN :searchProjectTypeHA \
          WHEN item.status_id = :candidateOngoing THEN :searchProjectTypeCandidate \
          WHEN item.status_id = :candidateSendout THEN :searchProjectTypeCandidate \
          WHEN item.status_id = :candidateSendover THEN :searchProjectTypeCandidate \
          WHEN item.status_id = :candidatePlaced THEN :searchProjectTypeCandidate \
          WHEN item.status_id = :candidateInactive THEN :searchProjectTypeCandidate \
          WHEN item.status_id = :haActive THEN :searchProjectTypeHA \
          WHEN item.status_id = :haInactive THEN :searchProjectTypeHA \
          ELSE :searchProjectTypeUndefined END as item_search_project_type',
          {
            nameUndefined: nameStatus.Name.Undefined,
            nameCandidate: nameStatus.Name.Candidate,
            nameHiringAuthority: nameStatus.Name.HiringAuthority,

            candidateOngoing: nameStatus.Candidate.Ongoing,
            candidateSendout: nameStatus.Candidate.Sendout,
            candidateSendover: nameStatus.Candidate.Sendover,
            candidatePlaced: nameStatus.Candidate.Placed,
            candidateInactive: nameStatus.Candidate.Inactive,

            haActive: nameStatus.HiringAuthority.Active,
            haInactive: nameStatus.HiringAuthority.Inactive,

            searchProjectTypeUndefined: SearchProjectTypes.Name,
            searchProjectTypeCandidate: SearchProjectTypes.NameCandidate,
            searchProjectTypeHA: SearchProjectTypes.NameHA,
          }
        ),
        'item.status',
        'item.status_id',
        'item.phone',
        'item.mobile',
        'item.origin_table_id as id',
        'item.email',
        'item.full_name',
        'item.location',
        'item.state',
        'item.city',
        'item.specialty',
        'item.subspecialty',
        'item.specialty_id',
        'item.subspecialty_id',
        'item.city_id',
        'item.state_id',
        'item.company as current_company',
        'item.company_type_id',
        'item.company_type',
        'item.company_type_color',
        'item.position_id',
        'item.position as position_title',
        'item.searchable_text',
        Database.raw('true as is_name'),
        'spnames.created_at',
        'item.last_activity_date',
        'item.last_activity_recruiter',
        'item.last_activity_title',
      ])
      .joinRaw(
        'inner join contacts_directory as item on spnames.name_id = item.origin_table_id AND item.role_id = :name',
        { name: nameTypes.Name }
      )
      .where((builder) => {
        if (ids.length > 0) builder.whereIn('spnames.name_id', ids);
      })
      .where('spnames.search_project_id', searchProjectId)
      .orderBy('item.origin_table_id');
  }

  /**
   * Update a search project inventory by inserting new items
   *
   * @param {Number} id
   * @param {Object} inventoryData
   * @param {Number} user_id
   * @param {Object} queryParams
   *
   * @return {Object} Search projects created
   *
   */
  async update(id, inventoryData, user_id, queryParams = null) {
    let trx;

    try {
      if (queryParams !== null) {
        const queryData = await SearchProjectRepository.getItemsByQueryParams(queryParams, user_id);
        SearchProjectRepository.mergeQueryDataWithInventory(inventoryData, queryData);
      }

      const { hasAtLeastOne: canManageSPs } = await UserRepository.hasRoles(user_id, [userRoles.DataCoordinator]);
      const searchProject = await SearchProject.query()
        .with('searchProjectCandidates')
        .with('searchProjectHiringAuthories')
        .with('searchProjectNames')
        .where('id', id)
        .where((builder) => {
          if (!canManageSPs) builder.where('created_by', user_id);
        })
        .first();

      if (!searchProject) {
        return {
          success: false,
          code: 404,
          message: 'Search project not found',
        };
      }

      //If job orders were passed, then get those hiring authorities
      if (inventoryData.job_orders) {
        inventoryData.hiring_authorities = inventoryData.hiring_authorities
          ? [
              ...inventoryData.hiring_authorities,
              ...(await SearchProjectRepository.obtainHiringAuthoritiesIds(inventoryData.job_orders)),
            ]
          : await SearchProjectRepository.obtainHiringAuthoritiesIds(inventoryData.job_orders);
      }

      const validatedItems = await SearchProjectRepository.validateSearchProjectCreation(
        inventoryData.candidates,
        inventoryData.hiring_authorities,
        inventoryData.names
      );
      if (!validatedItems.success) return validatedItems;

      const uniqValidatedItems = await this.removeDuplicateItems(validatedItems, searchProject.id);

      const isEmpty = this.checkIfItemsAreEmpty(uniqValidatedItems);
      if (isEmpty) {
        return {
          success: false,
          code: 400,
          message: 'All the items you are trying to add are already on the search project',
        };
      }

      trx = await Database.beginTransaction();

      const createdItems = await SearchProjectRepository.createSearchProjectInventory(
        uniqValidatedItems,
        user_id,
        searchProject.id,
        trx
      );
      if (!createdItems.success) {
        await trx.rollback();
        return createdItems;
      }

      const result = searchProject.toJSON();

      result.searchProjectCandidates = createdItems.data.searchProjectCandidates
        ? [...createdItems.data.searchProjectCandidates, ...result.searchProjectCandidates]
        : result.searchProjectCandidates;

      result.searchProjectHiringAuthories = createdItems.data.searchProjectHiringAuthories
        ? [...createdItems.data.searchProjectHiringAuthories, ...result.searchProjectHiringAuthories]
        : result.searchProjectHiringAuthories;

      result.searchProjectNames = createdItems.data.searchProjectNames
        ? [...createdItems.data.searchProjectNames, ...result.searchProjectNames]
        : result.searchProjectNames;

      await trx.commit();

      Event.fire(EventTypes.SearchProject.ItemAdded, {
        searchProjectId: searchProject.id,
        entity: EntityTypes.SearchProjectItem,
        operation: OperationType.Add,
        payload: { sent: { id, inventoryData, user_id, queryParams }, result },
        userId: user_id,
      });

      return {
        success: true,
        code: 200,
        data: result,
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      trx && (await trx.rollback());
      return {
        success: false,
        code: 500,
        message: 'There was a problem while adding items to a the search project',
      };
    }
  }

  /**
   * @description Checks if the new items array is empty
   *
   * @param {Object} uniqValidatedItems
   *
   * @return {Boolean} isEmpty
   *
   */
  checkIfItemsAreEmpty(uniqValidatedItems) {
    if (
      uniqValidatedItems.candidateIds.length <= 0 &&
      uniqValidatedItems.hiringAuthorityIds.length <= 0 &&
      uniqValidatedItems.nameIds.length <= 0
    ) {
      return true;
    }

    return false;
  }

  /**
   * @description Removes any item that the search project already has
   *
   * @param {Array} inventory
   * @param {Number} searchProjectId
   *
   * @return {Object} uniqInventory
   *
   */
  async removeDuplicateItems({ candidateIds = [], hiringAuthorityIds = [], nameIds = [] }, searchProjectId) {
    const searchProjectCandidates = await SearchProjectCandidate.query()
      .where('search_project_id', searchProjectId)
      .fetch();
    const searchProjectHiringAuthorities = await SearchProjectHiringAuthority.query()
      .where('search_project_id', searchProjectId)
      .fetch();
    const searchProjectNames = await SearchProjectName.query().where('search_project_id', searchProjectId).fetch();

    const searchProjectCandidateIds =
      searchProjectCandidates.rows.length > 0 ? searchProjectCandidates.rows.map((row) => row.candidate_id) : [];
    const searchProjectHAIds =
      searchProjectHiringAuthorities.rows.length > 0
        ? searchProjectHiringAuthorities.rows.map((row) => row.hiring_authority_id)
        : [];
    const searchProjectNameIds =
      searchProjectNames.rows.length > 0 ? searchProjectNames.rows.map((row) => row.name_id) : [];

    return {
      candidateIds: candidateIds.filter((id) => !searchProjectCandidateIds.includes(id)),
      hiringAuthorityIds: hiringAuthorityIds.filter((id) => !searchProjectHAIds.includes(id)),
      nameIds: nameIds.filter((id) => !searchProjectNameIds.includes(id)),
    };
  }

  /**
   * Deletes items from a search project by ids
   *
   * @param {Number} id - The search project id
   * @param {Object} inventoryData - The object containing the candidates, hirings, names & search params
   * @param {Number} userId - The user deleting the SP items
   *
   * @return {Object} Search projects created
   *
   */
  async delete(id, inventoryData, userId) {
    let trx;

    try {
      const { hasAtLeastOne: canManageSPs } = await UserRepository.hasRoles(userId, [userRoles.DataCoordinator]);
      const searchProject = await SearchProject.query()
        .where('id', id)
        .where((builder) => {
          if (!canManageSPs) builder.where('created_by', userId);
        })
        .first();

      if (!searchProject) {
        return {
          success: false,
          code: 404,
          message: 'Search project not found',
        };
      }

      const validatedItems = await SearchProjectRepository.validateSearchProjectCreation(
        inventoryData.candidates,
        inventoryData.hiring_authorities,
        inventoryData.names
      );
      if (!validatedItems.success) return validatedItems;

      trx = await Database.beginTransaction();

      const itemsToRemove = { ...validatedItems, searchParams: inventoryData.search_params };
      const deletedItems = await this.deleteSearchProjectInventory(itemsToRemove, searchProject.id, trx, userId);
      if (!deletedItems.success) {
        await trx.rollback();
        return deletedItems;
      }

      const result = { ...searchProject.toJSON(), ...deletedItems.data };

      await trx.commit();

      Event.fire(EventTypes.SearchProject.ItemDeleted, {
        searchProjectId: searchProject.id,
        entity: EntityTypes.SearchProjectItem,
        operation: OperationType.Delete,
        payload: { sent: { id, inventoryData, user_id: userId }, result },
        userId: userId,
      });

      return {
        success: true,
        code: 200,
        data: result,
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
      trx && (await trx.rollback());

      return {
        success: false,
        code: 500,
        message: Antl.formatMessage('messages.error.internalServer', {
          action: 'deleting',
          entity: 'search project items',
        }),
      };
    }
  }

  /**
   * @description Delete the specific items from one search projects
   *
   * @param {Object} itemsToRemove - An object containing the items being removed
   * @param {Array} itemsToRemove.candidateIds - The candidates that will be removed
   * @param {Array} itemsToRemove.hiringAuthorityIds - The ha that will be removed
   * @param {Array} itemsToRemove.nameIds - The names that will be removed
   * @param {Array} itemsToRemove.searchParams - The SPP search params that will be removed
   * @param {Number} searchProjectId - The search project that will have their items removed
   * @param {Object} trx - An outside trx, helpful for managing transaction outside the scope
   * @param {Number} searchProjectId - The recruiter removing the items
   *
   * @return {Object} An object containing a success value & the data
   *
   */
  async deleteSearchProjectInventory(itemsToRemove, searchProjectId, trx, userId) {
    try {
      const { candidateIds = [], hiringAuthorityIds = [], nameIds = [], searchParams = {} } = itemsToRemove;
      const searchProjectSelection = { params: searchParams };
      const result = {
        success: true,
        code: 200,
        data: {
          searchProjectCandidates: 0,
          searchProjectHiringAuthories: 0,
          searchProjectNames: 0,
        },
      };

      const inventoryIds = await this.getInventoryByParams(searchProjectSelection, searchProjectId, userId);
      if (inventoryIds.success === false) return inventoryIds;

      const candidateIdsToRemove = [...candidateIds, ...inventoryIds.candidates];
      const haIdsToRemove = [...hiringAuthorityIds, ...inventoryIds.ha];
      const nameIdsToRemove = [...nameIds, ...inventoryIds.names];

      if (candidateIdsToRemove.length > 0) {
        result.data.searchProjectCandidates = await SearchProjectCandidate.query()
          .where('search_project_id', searchProjectId)
          .whereIn('candidate_id', candidateIdsToRemove)
          .transacting(trx)
          .delete();
      }

      if (haIdsToRemove.length > 0) {
        result.data.searchProjectHiringAuthories = await SearchProjectHiringAuthority.query()
          .where('search_project_id', searchProjectId)
          .whereIn('hiring_authority_id', haIdsToRemove)
          .transacting(trx)
          .delete();
      }

      if (nameIdsToRemove.length > 0) {
        result.data.searchProjectNames = await SearchProjectName.query()
          .where('search_project_id', searchProjectId)
          .whereIn('name_id', nameIdsToRemove)
          .transacting(trx)
          .delete();
      }

      return result;
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
      return {
        success: false,
        code: 500,
        message: Antl.formatMessage('messages.error.internalServer', {
          action: 'deleting',
          entity: 'search project items',
        }),
      };
    }
  }

  async getInventoryByParams(searchProjectSelection, searchProjectId, userId) {
    const { query, exclude = [] } = searchProjectSelection.params ? searchProjectSelection.params : {};
    const nameIds = searchProjectSelection.nameIds ? searchProjectSelection.nameIds : [];
    const candidateIds = searchProjectSelection.candidateIds ? searchProjectSelection.candidateIds : [];
    const haIds = searchProjectSelection.hiringAuthorityIds ? searchProjectSelection.hiringAuthorityIds : [];

    const validatedItems = await SearchProjectRepository.validateSearchProjectCreation(candidateIds, haIds, nameIds);
    if (!validatedItems.success) return validatedItems;

    const ids = {
      names: nameIds,
      candidates: candidateIds,
      ha: haIds,
    };

    if (!query) return ids;

    const filters = pick(query, [
      'stateId',
      'cityId',
      'specialtyId',
      'subspecialtyId',
      'itemSearchProjectType',
      'stateIds',
      'cityIds',
      'specialtyIds',
      'subspecialtyIds',
      'itemSearchProjectTypes',
      'statusId',
      'statusIds',
      'positionId',
      'positionIds',
      'companyTypeId',
      'companyTypeIds',
    ]);

    const paginationData = pick(query, ['orderBy', 'direction']);
    paginationData.page = 1;
    paginationData.perPage = 1000000;

    const keyword = query.keyword;

    const result = await this.details(filters, paginationData, keyword, searchProjectId, userId);
    if (!result.success) return result;

    const items = result.data;
    for (const row of items.data) {
      const sameItem = (itemA, itemB) =>
        Number(itemA.id) === Number(itemB.id) &&
        Number(itemA.item_search_project_type) == Number(itemB.item_search_project_type);

      if (exclude.find((excluded) => sameItem(excluded, row))) continue;

      switch (Number(row.item_search_project_type)) {
        case SearchProjectTypes.Name:
        case SearchProjectTypes.NameCandidate:
        case SearchProjectTypes.NameHA:
          ids.names.push(row.id);
          break;

        case SearchProjectTypes.Candidate:
          ids.candidates.push(row.id);
          break;

        case SearchProjectTypes.HiringAuthority:
          ids.ha.push(row.id);
          break;

        default:
          throw `A new search project type has not been yet implemented in the search project`;
      }
    }

    return ids;
  }

  /**
   * Return the where clause to apply on the query
   * GET where clause
   *
   * @param {Request} ctx.request
   */
  applyKeywordClause(keyword, query) {
    if (keyword) {
      query.where('searchable_text', 'ilike', `%${keyword}%`);
    }
  }

  /**
   * Apply the where clause on the query.
   *
   * @method applyWhereClause
   *
   * @param {Request} ctx.request
   * @param {Knex} query
   *
   */
  async applyWhereClause(filters, query) {
    const filtersToEvaluate = Object.keys(filters);
    for (const keyFilter of filtersToEvaluate) {
      const filterMapEntry = this._filterOptionsColumnMap[keyFilter];
      if (!filterMapEntry) continue;
      const { resolver, column, parser } = filterMapEntry;
      const value = parser instanceof Function ? parser(filters[keyFilter]) : filters[keyFilter];
      if (!value || !(resolver instanceof Function)) continue;
      await resolver({ query, column, value });
    }
  }

  /**
   * Apply the order clause on the query.
   *
   * @method applyOrderClause
   *
   * @param {String} orderBy
   * @param {String} direction
   * @param {Knex} query
   *
   */
  applyOrderClause(orderBy, direction, query) {
    const orderByParameter = orderBy ? orderBy : 'created_at';

    const validDirections = ['asc', 'desc'];
    const orderingOptions = [
      'item_search_project_type',
      'full_name',
      'email',
      'specialty',
      'subspecialty',
      'location',
      'created_at',
    ];

    const orderDirection = validDirections.find((dir) => dir === direction) || validDirections[1];
    const orderClause = orderingOptions.find((element) => element === orderByParameter);

    if (orderClause) {
      query.orderBy(orderClause, orderDirection);
    }
  }
}

module.exports = SearchProjectInventoryRepository;
