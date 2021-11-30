'use strict';

//Models
const SearchProject = use('App/Models/SearchProject');
const SearchProjectType = use('App/Models/SearchProjectType');
const SearchProjectCandidate = use('App/Models/SearchProjectCandidate');
const SearchProjectHiringAuthority = use('App/Models/SearchProjectHiringAuthority');
const SearchProjectName = use('App/Models/SearchProjectName');
const Candidate = use('App/Models/Candidate');
const HiringAuthority = use('App/Models/HiringAuthority');
const Name = use('App/Models/Name');
const SearchProjectChangeLog = use('App/Models/SearchProjectChangeLog');

//Repositories
const JobOrderRepository = new (use('App/Helpers/JobOrderRepository'))();
const CandidateController = new (use('App/Controllers/Http/CandidateController'))();
const JobOrderController = new (use('App/Controllers/Http/JobOrderController'))();
const NameController = new (use('App/Controllers/Http/NameController'))();
const UserRepository = new (use('App/Helpers/UserRepository'))();

//Utils
const Antl = use('Antl');
const appInsights = require('applicationinsights');
const Database = use('Database');
const { uniq } = use('lodash');
const { userRoles, nameStatus, nameTypes, DateFormats, OperationType, EntityTypes, SearchProjectTypes } =
  use('App/Helpers/Globals');
const moment = use('moment');
const Event = use('Event');
const EventTypes = use('App/Helpers/Events');

class SearchProjectRepository {
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

  /**
   * Show a list of search projects
   *
   * @param {Request} req
   * @param {String} user_id
   *
   * @return {Object} Search project list with a succes message or an error code
   *
   */
  async listing(req, user_id) {
    try {
      const { keyword, createdBy, onlyMine, isPrivate, addedDate, page, perPage, orderBy, direction } = req.all();

      const { hasAtLeastOne: canManageSPs } = await UserRepository.hasRoles(user_id, [userRoles.DataCoordinator]);

      const query = SearchProject.query();

      query.select([
        'search_projects.id',
        'search_projects.name',
        'search_projects.is_private',
        'search_projects.created_by',
        'users.user_name as created_by_full_name',
        Database.raw(
          'coalesce(candidates_count.total::INTEGER, 0) + coalesce(names_count.ca_name_total::INTEGER, 0) as total_candidates'
        ),
        Database.raw(
          'coalesce(ha_count.total::INTEGER, 0) + coalesce(names_count.ha_name_total::INTEGER, 0) as total_hiring_authorities'
        ),
        Database.raw('coalesce(names_count.undefined_name_total::INTEGER, 0) as total_undefined_names'),
        Database.raw(
          'coalesce(ha_count.total::INTEGER, 0) + coalesce(names_count.ha_name_total::INTEGER, 0) + coalesce(candidates_count.total::INTEGER, 0) + coalesce(names_count.ca_name_total::INTEGER, 0) + coalesce(names_count.undefined_name_total::INTEGER, 0) as total_items'
        ),
        'search_projects.created_at',
        'search_projects.updated_at',
      ]);

      query.innerJoin('v_users as users', 'users.id', 'search_projects.created_by');

      query.joinRaw(
        'left join (select search_project_id, count(*) as total from search_project_candidates group by search_project_id) as candidates_count on candidates_count.search_project_id = search_projects.id'
      );

      query.joinRaw(
        'left join (select search_project_id, count(*) as total from search_project_hiring_authorities group by search_project_id) as ha_count on ha_count.search_project_id = search_projects.id'
      );

      const nameCandidate = this.joinStringForQueryUsage([
        nameStatus.Name.Candidate,
        nameStatus.Candidate.Ongoing,
        nameStatus.Candidate.Sendout,
        nameStatus.Candidate.Sendover,
        nameStatus.Candidate.Placed,
        nameStatus.Candidate.Inactive,
      ]);

      const nameHiringAuthority = this.joinStringForQueryUsage([
        nameStatus.Name.HiringAuthority,
        nameStatus.HiringAuthority.Active,
        nameStatus.HiringAuthority.Inactive,
      ]);

      const nameUndefined = this.joinStringForQueryUsage([nameStatus.Name.Undefined]);

      query.joinRaw(
        `left join (\
          select\
            spn.search_project_id,\
            count(*) filter(where names.name_status_id in ${nameCandidate}) as ca_name_total,\
            count(*) filter(where names.name_status_id in ${nameHiringAuthority}) as ha_name_total,\
            count(*) filter(where names.name_status_id in ${nameUndefined}) as undefined_name_total\
          from search_project_names as spn\
          inner join names on spn.name_id = names.id group by search_project_id) as names_count\
        on names_count.search_project_id = search_projects.id`
      );

      this.applyKeywordClause(keyword, query, 'search_projects.name');
      this.applyWhereClause(
        {
          createdBy,
          onlyMine,
          user_id,
          addedDate,
          isPrivate,
        },
        query,
        canManageSPs
      );
      this.applyOrderClause(orderBy, direction, query);

      const result = await query.paginate(page ? page : 1, perPage ? perPage : 10);

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
        message: 'There was a problem when retrieving the search projects',
      };
    }
  }

  /**
   * Show a list of search projects types
   *
   * @param {Request} req
   *
   * @return {Object} Search project types list with a succes message or an error code
   *
   */
  async listingTypes() {
    try {
      const result = await SearchProjectType.query()
        .whereIn('id', [SearchProjectTypes.Candidate, SearchProjectTypes.HiringAuthority])
        .fetch();

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
        message: 'There was a problem when retrieving the search projects types',
      };
    }
  }

  /**
   * Obtains the item's ids by the listing query params
   *
   * @summary Allows getting all ids from a 'all items' from a listing filtered by specific parameters, be it job orders, hiring authorities, names or job orders
   *
   * @param {Object} queryParams - The object that contains the neccesary info to call the listing
   * @param {Object} queryParams.candidate_query - Has the candidate information
   * @param {Object} queryParams.joborder_query - Has the job orders information
   * @param {Object} queryParams.ha_query - Has the hiring authorities information
   * @param {Object} queryParams.name_query - Has the name information
   * @param {Object} queryParams.search_project_id - The search project id from where the search_params will take inventory from
   * @param {Object} queryParams.search_params - This contains the search project params used for a certain 'search'
   * @param {boolean} queryParams.candidate_query.params - Contains all the query params used in the filter, applies to all 4 object
   * @param {boolean} queryParams.candidate_query.exclude - Which items should be excluded from the listing returned, applies to all 4 object
   *
   * @return {Object} User activities
   */
  async getItemsByQueryParams(queryParams = {}, userId) {
    const SPInventoryRepository = new (use('App/Helpers/SearchProjectInventoryRepository'))();
    const candidateQuery = queryParams.candidate_query;
    const jobOrderQuery = queryParams.joborder_query;
    const nameQuery = queryParams.name_query;
    const searchProjectId = queryParams.search_project_id;
    const searchProjectQuery = queryParams.search_params;

    const result = {
      candidateIds: [],
      jobOrderIds: [],
      nameIds: {
        names: [],
        candidates: [],
        ha: [],
      },
    };

    if (candidateQuery) {
      result.candidateIds = await this.getCandidatesByQueryParams(candidateQuery, userId);
    }

    if (jobOrderQuery) {
      result.jobOrderIds = await this.getJobOrdersByQueryParams(jobOrderQuery, userId);
    }

    if (nameQuery) {
      result.nameIds = await this.getNamesByQueryParams(nameQuery, userId);
    }

    if (searchProjectQuery && searchProjectId) {
      const inventoryIds = await SPInventoryRepository.getInventoryByParams(
        searchProjectQuery,
        searchProjectId,
        userId
      );
      if (inventoryIds.success === false) throw new Error(inventoryIds);
      result.nameIds.names.push(...inventoryIds.names);
      result.nameIds.candidates.push(...inventoryIds.candidates);
      result.nameIds.ha.push(...inventoryIds.ha);
    }

    return result;
  }

  async getCandidatesByQueryParams({ query, exclude = [] }, user_id) {
    if (!query) return [];

    query.page = 1; //All results must be in page one
    const result = await CandidateController.listingQuery(query, user_id);

    const ids = result.data.flatMap((row) => {
      if (exclude.includes(row.id)) return [];

      return row.id;
    });

    return ids;
  }

  async getJobOrdersByQueryParams({ query, exclude = [] }, user_id) {
    if (!query) return [];

    query.page = 1;
    const result = await JobOrderController.listingQuery(query, user_id);

    const ids = result.data.flatMap((row) => {
      if (exclude.includes(row.id)) return [];

      return row.id;
    });

    return ids;
  }

  async getNamesByQueryParams({ query, exclude = [] }, user_id) {
    const ids = {
      names: [],
      candidates: [],
      ha: [],
    };

    if (!query) return ids;

    query.page = 1;
    const result = await NameController.listingQuery(query, user_id);

    for (const row of result.data) {
      if (exclude.find((excluded) => excluded.id === row.id && excluded.role_id == row.role_id)) continue;

      switch (row.role_id) {
        case nameTypes.Name:
          ids.names.push(row.id);
          break;

        case nameTypes.Candidate:
          ids.candidates.push(row.id);
          break;

        case nameTypes.HiringAuthority:
          ids.ha.push(row.id);
          break;

        default:
          throw `A new name type has not been yet implemented in the search project`;
          break;
      }
    }

    return ids;
  }

  /**
   * Merges the queryData & the inventoryData, to allows a seamless interaction with the SP creation method
   *
   * @summary This method allows a smooth integration between the orginal inventoryData, and the new queryData obtained
   *
   * @param {Object} inventoryData - Contains the data passed when creating a search project
   * @param {Number[]} inventoryData.candidates - The candidates ids passed
   * @param {Number[]} inventoryData.hiring_authorities - The hirings ids passed
   * @param {Number[]} inventoryData.names - The names ids passed
   * @param {Number[]} inventoryData.job_orders - The job orders ids passed
   * @param {Object} queryData - Contains the data obtained by the queries listing
   * @param {Number[]} queryData.candidateIds - The candidates ids found
   * @param {Number[]} queryData.jobOrderIds - The hirings ids found
   * @param {Number[]} queryData.hiringAuthoritiesIds - The names ids found
   * @param {Number[]} queryData.nameIds - The job orders ids found
   *
   * @return {Object} User activities
   */
  mergeQueryDataWithInventory(inventoryData, queryData) {
    inventoryData.candidates = this.mergerArrayHelper(inventoryData.candidates, queryData.candidateIds);
    inventoryData.candidates = this.mergerArrayHelper(inventoryData.candidates, queryData.nameIds.candidates);
    inventoryData.job_orders = this.mergerArrayHelper(inventoryData.job_orders, queryData.jobOrderIds);
    inventoryData.hiring_authorities = this.mergerArrayHelper(inventoryData.hiring_authorities, queryData.nameIds.ha);
    inventoryData.names = this.mergerArrayHelper(inventoryData.names, queryData.nameIds.names);
  }

  /**
   * Merges two arrays & returns only one
   *
   * @summary This methods modifies the passed parentArray by adding the elements of the childArray. This method can support the case were the parent array does not exists in any case
   *
   * @param {Object[]} parentArray - To where the other array will be merge to, can or not exists (a null | undefined can be sent here, will be created at execution time)
   * @param {Object[]} childArray - The array expected to be merged, this one must an array with data
   *
   * @return {Object[]} Merged arrays
   */
  mergerArrayHelper(parentArray, childArray) {
    if (!parentArray || parentArray.length <= 0) parentArray = [];

    parentArray.push(...childArray);

    return parentArray;
  }

  /**
   * Returns the changes that the items passed will cause to the SP
   *
   * @param {Number} id
   * @param {Object} inventoryData
   * @param {Number[]} inventoryData.candidates
   * @param {Number[]} inventoryData.names
   * @param {Number[]} inventoryData.job_orders
   * @param {Number[]} inventoryData.hiring_authorities
   * @param {Number} userId
   * @param {Object} queryParams
   * @param {Object} queryParams.candidate_query
   * @param {Object} queryParams.joborder_query
   * @param {Object} queryParams.name_query
   *
   * @return {Object} Search project preview
   *
   */
  async preview(id, inventoryData, userId, queryParams = null) {
    try {
      const { hasAtLeastOne: canManageSPs } = await UserRepository.hasRoles(userId, [userRoles.DataCoordinator]);
      const searchProjectFound = await SearchProject.query()
        .with('searchProjectHiringAuthories')
        .with('searchProjectCandidates')
        .with('searchProjectNames')
        .where('id', id)
        .where(function () {
          if (!canManageSPs) this.where('created_by', userId);
        })
        .first();
      if (!searchProjectFound) {
        return {
          success: false,
          code: 404,
          message: 'Search project not found',
        };
      }
      const searchProject = searchProjectFound.toJSON();

      //Obtain the ids from the queryParams
      if (queryParams) {
        const queryData = await this.getItemsByQueryParams(queryParams, userId);
        this.mergeQueryDataWithInventory(inventoryData, queryData);
      }

      inventoryData.hiring_authorities.push(...(await this.obtainHiringAuthoritiesIds(inventoryData.job_orders))); //Lets merge the hiring authorities from the job orders

      const searchProjectHAIds = searchProject.searchProjectHiringAuthories.map((row) => row.hiring_authority_id);
      const searchProjectCandidateIds = searchProject.searchProjectCandidates.map((row) => row.candidate_id);
      const searchProjectNameIds = searchProject.searchProjectNames.map((row) => row.name_id);

      const hiringAuthoritiesResult = {
        newIds: uniq(inventoryData.hiring_authorities.filter((id) => !searchProjectHAIds.includes(id))),
        repeatedIds: uniq(inventoryData.hiring_authorities.filter((id) => searchProjectHAIds.includes(id))),
      };

      const candidatesResult = {
        newIds: uniq(inventoryData.candidates.filter((id) => !searchProjectCandidateIds.includes(id))),
        repeatedIds: uniq(inventoryData.candidates.filter((id) => searchProjectCandidateIds.includes(id))),
      };

      const namesResult = {
        newIds: uniq(inventoryData.names.filter((id) => !searchProjectNameIds.includes(id))),
        repeatedIds: uniq(inventoryData.names.filter((id) => searchProjectNameIds.includes(id))),
      };

      return {
        success: true,
        code: 200,
        data: {
          hiringAuthoritiesResult,
          candidatesResult,
          namesResult,
          newIdsCount:
            Number(hiringAuthoritiesResult.newIds.length) +
            Number(candidatesResult.newIds.length) +
            Number(namesResult.newIds.length),
          repeatedIdsCount:
            Number(hiringAuthoritiesResult.repeatedIds.length) +
            Number(candidatesResult.repeatedIds.length) +
            Number(namesResult.repeatedIds.length),
        },
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      return {
        success: false,
        code: 500,
        message: 'Something went wrong while getting the search project preview',
      };
    }
  }

  /**
   * Creates a search project
   *
   * @param {Object} searchProjectData
   * @param {Object} inventoryData
   * @param {Number} user_id
   * @param {Object} queryParams
   *
   * @return {Object} Search projects created
   *
   */
  async create(searchProjectData, inventoryData, user_id, queryParams = null) {
    let trx;

    try {
      //Obtain the ids from the queryParams
      if (queryParams !== null) {
        const queryData = await this.getItemsByQueryParams(queryParams, user_id);
        this.mergeQueryDataWithInventory(inventoryData, queryData);
      }

      searchProjectData.created_by = user_id;
      searchProjectData.updated_by = user_id;

      //If job orders were passed, then get those hiring authorities
      if (inventoryData.job_orders) {
        inventoryData.hiring_authorities = inventoryData.hiring_authorities
          ? [...inventoryData.hiring_authorities, ...(await this.obtainHiringAuthoritiesIds(inventoryData.job_orders))]
          : await this.obtainHiringAuthoritiesIds(inventoryData.job_orders);
      }

      const validatedItems = await this.validateSearchProjectCreation(
        inventoryData.candidates,
        inventoryData.hiring_authorities,
        inventoryData.names
      );
      if (!validatedItems.success) return validatedItems;

      trx = await Database.beginTransaction();

      const searchProject = await SearchProject.create(searchProjectData, trx);

      const createdItems = await this.createSearchProjectInventory(validatedItems, user_id, searchProject.id, trx);
      if (!createdItems.success) {
        await trx.rollback();
        return createdItems;
      }

      const result = { ...searchProject.toJSON(), ...createdItems.data };

      await trx.commit();

      Event.fire(EventTypes.SearchProject.Created, {
        searchProjectId: searchProject.id,
        entity: EntityTypes.SearchProject,
        operation: OperationType.Create,
        payload: { sent: { searchProjectData, inventoryData, user_id, queryParams }, result },
        userId: user_id,
      });

      return {
        success: true,
        code: 201,
        data: result,
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      trx && (await trx.rollback());
      return {
        success: false,
        code: 500,
        message: 'There was a problem when creating a search project',
      };
    }
  }

  /**
   * @description Validate that the inventory to be created is valid
   *
   * @param {Array} candidates
   * @param {Array} hiringAuthorities
   * @param {Array} names
   *
   * @return {Array} validatedCandidateIds
   *
   */
  async validateSearchProjectCreation(candidates, hiringAuthorities, names) {
    const result = { success: true, code: 200 };

    if (candidates) {
      const candidateValidation = await this.validateItems(candidates, Candidate);

      if (!candidateValidation.success) {
        return {
          success: false,
          code: 400,
          message: `You passed a invalid candidate id: ${candidateValidation.data}`,
        };
      }

      result.candidateIds = candidateValidation.data;
    }

    if (hiringAuthorities) {
      const hiringAuthorityValidation = await this.validateItems(hiringAuthorities, HiringAuthority);

      if (!hiringAuthorityValidation.success) {
        return {
          success: false,
          code: 400,
          message: `You passed a invalid hiring authority id: ${hiringAuthorityValidation.data}`,
        };
      }

      result.hiringAuthorityIds = hiringAuthorityValidation.data;
    }

    if (names) {
      const namesValidation = await this.validateItems(names, Name);

      if (!namesValidation.success) {
        return {
          success: false,
          code: 400,
          message: `You passed a invalid name id: ${namesValidation.data}`,
        };
      }

      result.nameIds = namesValidation.data;
    }

    return result;
  }

  /**
   * @description Validate that all item ids are valid
   *
   * @param {Array} itemIds
   *
   * @return {Array} validatedItemIds
   *
   */
  async validateItems(itemIds, Model) {
    const uniqItemIds = uniq(itemIds);

    const result = await Model.query().whereIn('id', uniqItemIds).fetch();
    const validIds = result.toJSON().map((item) => item.id);

    const difference = uniqItemIds.filter((row) => !validIds.includes(row));

    if (difference.length > 0) {
      return { success: false, data: difference };
    } else {
      return { success: true, data: validIds };
    }
  }

  /**
   * @description Create the inventory for one search project
   *
   * @param {Array} candidateIds
   * @param {Number} userId
   * @param {Number} searchProjectId
   * @param {Object} trx
   *
   * @return {Object} Candidates
   *
   */
  async createSearchProjectInventory({ candidateIds, hiringAuthorityIds, nameIds }, userId, searchProjectId, trx) {
    try {
      const result = {
        success: true,
        code: 201,
        data: {},
      };

      const candidates = candidateIds
        ? candidateIds.map((candidateId) => ({
            candidate_id: candidateId,
            created_by: userId,
            search_project_id: searchProjectId,
          }))
        : null;

      const hiringAuthorities = hiringAuthorityIds
        ? hiringAuthorityIds.map((hiringAuthorityId) => ({
            hiring_authority_id: hiringAuthorityId,
            created_by: userId,
            search_project_id: searchProjectId,
          }))
        : null;

      const names = nameIds
        ? nameIds.map((nameId) => ({
            name_id: nameId,
            created_by: userId,
            search_project_id: searchProjectId,
          }))
        : null;

      const useTimestamps = true;

      if (candidates && candidates.length > 0) {
        // result.data.searchProjectCandidates = await SearchProjectCandidate.createMany(candidates, trx);
        result.data.searchProjectCandidates = await this.bulkInsert(
          SearchProjectCandidate,
          candidates,
          trx,
          useTimestamps
        );
      } else {
        result.data.searchProjectCandidates = [];
      }

      if (hiringAuthorities && hiringAuthorities.length > 0) {
        // result.data.searchProjectHiringAuthories = await SearchProjectHiringAuthority.createMany(
        //   hiringAuthorities,
        //   trx
        // );
        result.data.searchProjectHiringAuthories = await this.bulkInsert(
          SearchProjectHiringAuthority,
          hiringAuthorities,
          trx,
          useTimestamps
        );
      } else {
        result.data.searchProjectHiringAuthories = [];
      }

      if (names && names.length > 0) {
        // result.data.searchProjectNames = await SearchProjectName.createMany(names, trx);
        result.data.searchProjectNames = await this.bulkInsert(SearchProjectName, names, trx, useTimestamps);
      } else {
        result.data.searchProjectNames = [];
      }

      return result;
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
      return {
        success: false,
        code: 500,
        message: 'There was a problem while creating the inventory for search projects',
      };
    }
  }

  async bulkInsert(model, data, trx, useTimestamps) {
    if (useTimestamps === true) {
      const now = moment.utc().format(DateFormats.SystemDefault);
      for (const row of data) {
        row.created_at = now;
        row.updated_at = now;
      }
    }

    return await Database.table(model.table).transacting(trx).insert(data, ['*']);
  }

  /**
   * Logs a search project change
   *
   * @method logChange
   *
   * @description Use this whenever a change is made to a SP & is deemed important to record in the audit trail
   *
   * @param {Number} searchProjectId - The SP that suffered the change
   * @param {String} entity - What changed in the SP (item added, ..., etc)
   * @param {String} operation - Related operation (create, update, delete)
   * @param {Object} payload - Content of the changed object
   * @param {Number} userId - Who made the change
   */
  async logChange(searchProjectId, entity, operation, payload, userId) {
    try {
      await SearchProjectChangeLog.create({
        search_project_id: searchProjectId,
        entity,
        operation,
        payload,
        created_by: userId,
      });
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
    }
  }

  /**
   * @description Obtain hirings authorities from jobs orders ids
   *
   * @param {Array} inventory
   *
   * @return {Array} hiringAuthorities
   *
   */
  async obtainHiringAuthoritiesIds(inventory) {
    const jobOrderIds = uniq(inventory);

    const result = await JobOrderRepository.getAvailableHiringAuthoritiesByArray(jobOrderIds);

    const hiringAuthoritiesIds = result.data;

    return hiringAuthoritiesIds;
  }

  /**
   * Deletes a search project by id
   *
   * @param {Request} req
   * @param {String} user_id
   *
   * @return {Object} Search projects deleted
   *
   */
  async delete(id, user_id) {
    let trx;

    try {
      const searchProject = await SearchProject.query()
        .with('searchProjectCandidates')
        .with('searchProjectHiringAuthories')
        .with('searchProjectNames')
        .where('id', id)
        .andWhere('created_by', user_id)
        .first();

      if (!searchProject) {
        return {
          success: false,
          code: 404,
          message: 'Search project not found',
        };
      }

      const searchProjectInUse = await this.checkSearchProjectInUse(id);
      if (searchProjectInUse.code !== 200) return searchProjectInUse;

      trx = await Database.beginTransaction();

      await SearchProjectCandidate.query().where('search_project_id', id).transacting(trx).delete();
      await SearchProjectHiringAuthority.query().where('search_project_id', id).transacting(trx).delete();
      await SearchProjectName.query().where('search_project_id', id).transacting(trx).delete();
      await SearchProject.query().where('id', id).transacting(trx).delete();

      const result = searchProject;

      await trx.commit();

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
        message: 'There was a problem while deleting a search project',
      };
    }
  }

  /**
   * Updates a search project by id
   *
   * @param {Request} req
   * @param {Object} newSearchProjectData
   * @param {String} userId
   *
   * @return {Object} Search project updated
   *
   */
  async update(id, newSearchProjectData = {}, userId) {
    const canUpdateSearchproject = async (searchProject = {}, userId) => {
      const { created_by } = searchProject;
      const { hasAtLeastOne: canUpdateSP } = await UserRepository.hasRoles(userId, [userRoles.DataCoordinator]);
      return !(userId != created_by && !canUpdateSP);
    };
    try {
      const { name, isPrivate, ownerId } = newSearchProjectData;
      const searchProject = await SearchProject.query().where('id', id).first();

      if (!searchProject) {
        return {
          success: false,
          code: 404,
          message: Antl.formatMessage('messages.error.notFound', { entity: 'Search Project' }),
        };
      }

      if (!(await canUpdateSearchproject(searchProject, userId))) {
        return {
          success: false,
          code: 403,
          isInactive: false,
          redirect: false,
          message: Antl.formatMessage('messages.error.authorization'),
        };
      }

      await searchProject.merge({
        name,
        is_private: isPrivate,
        created_by: ownerId,
        updated_by: userId,
      });
      await searchProject.save();

      const result = searchProject;

      Event.fire(EventTypes.SearchProject.Updated, {
        searchProjectId: searchProject.id,
        entity: EntityTypes.SearchProject,
        operation: OperationType.Update,
        payload: { sent: { id, newSearchProjectData, user_id: userId }, result },
        userId,
      });

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
        message: Antl.formatMessage('messages.error.internalServer', {
          action: 'updating',
          entity: 'search project',
        }),
      };
    }
  }

  /**
   * @description Deletes a search project by id
   *
   * @param {Number} Checks if the search project is being use in any other form
   *
   * @return {Object} Search projects created
   *
   */
  async checkSearchProjectInUse(id) {
    try {
      //BULK EMAIL VALIDATION SHOULD BE HEEEEERE!!
      return {
        success: true,
        code: 200,
      };
    } catch (error) {
      return {
        success: false,
        code: 500,
        message: 'There was a problem while checking the search project status for deletion',
      };
    }
  }

  /**
   * Return the where clause to apply on the query.
   * GET where clause
   *
   * @param {Request} ctx.request
   */
  applyKeywordClause(keyword, query, field) {
    if (keyword) {
      query.where(field, 'ilike', `%${keyword}%`);
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
      'name',
      'is_private',
      'created_by',
      'type',
      'total_candidates',
      'total_hiring_authorities',
      'total_names',
      'created_at',
      'created_by_full_name',
    ];

    const orderDirection = validDirections.find((dir) => dir === direction) || validDirections[1];
    const orderClause = orderingOptions.find((element) => element === orderByParameter);

    if (orderClause) {
      query.orderBy(orderClause, orderDirection);
    }
  }

  /**
   * Apply the where clause on the query.
   *
   * @method applyWhereClause
   *
   * @param {Request} ctx.request
   * @param {Knex} query
   * @param {Boolean} canManageSPs - Allows to know if the where method should applies the DC Team rules
   *
   */
  async applyWhereClause(req, query, canManageSPs = false) {
    const { createdBy, onlyMine, user_id, addedDate, isPrivate } = req;

    if (createdBy) {
      query.where(function () {
        this.where('search_projects.created_by', createdBy);
        if (!canManageSPs) this.andWhere('search_projects.is_private', false);
      });
    } else {
      if (onlyMine) {
        query.where('search_projects.created_by', user_id);
      } else if (!canManageSPs) {
        query.where(function () {
          this.where('search_projects.is_private', false).orWhere('search_projects.created_by', user_id);
        });
      }
    }

    if (addedDate) {
      query.whereRaw('search_projects.created_at::DATE = ?', addedDate);
    }

    if (isPrivate !== null && isPrivate !== undefined) {
      query.where('search_projects.is_private', isPrivate);
    }
  }

  /**
   * Returns the Searchs without inventory of a user
   *
   * @method byUser
   *
   * @param {Integer} userId
   */
  async byUser(userId) {
    try {
      const result = await SearchProject.query().where('created_by', userId).fetch();
      return {
        success: true,
        code: 201,
        data: result,
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      return {
        success: false,
        code: 500,
        message: 'There was a problem getting the info!',
      };
    }
  }
}

module.exports = SearchProjectRepository;
