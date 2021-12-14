'use strict';

/** @typedef {import('@adonisjs/framework/src/Request')} Request */
/** @typedef {import('@adonisjs/framework/src/Response')} Response */
/** @typedef {import('@adonisjs/framework/src/View')} View */

//Repositories
const SearchProjectRepository = new (use('App/Helpers/SearchProjectRepository'))();
const SearchProjectInventoryRepository = new (use('App/Helpers/SearchProjectInventoryRepository'))();

//Utils
const appInsights = require('applicationinsights');

/**
 * Resourceful controller for interacting with searchprojects
 */
class SearchProjectController {
  /**
   * Show a list of all searchprojects.
   * GET searchprojects
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async index({ auth, request, response }) {
    const result = await SearchProjectRepository.listing(request, auth.current.user.id);

    return response.status(result.code).send(result.success ? result.data : result);
  }

  /**
   * Show a a preview of the changes that will be applied to a search project by items (name, has & candidates)
   * GET :id/preview
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async preview({ auth, request, response }) {
    try {
      const searchProjectId = request.params.id;
      const inventoryData = request.only(['candidates', 'hiring_authorities', 'names', 'job_orders']);
      const queryParams = request.only([
        'candidate_query',
        'joborder_query',
        'name_query',
        'search_project_id',
        'search_params',
      ]);
      const userId = auth.current.user.id;

      const result = await SearchProjectRepository.preview(searchProjectId, inventoryData, userId, queryParams);

      return response.status(result.code).send(result.success ? result.data : result);
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
      return response.status(500).send({
        success: false,
        message: 'Something went wrong while getting the search project preview',
      });
    }
  }

  /**
   * Show a list of all searchproject types.
   * GET searchprojects/types
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async indexTypes({ request, response }) {
    const result = await SearchProjectRepository.listingTypes();

    return response.status(result.code).send(result.success ? result.data : result);
  }

  /**
   * Create/save a new searchproject.
   * POST searchprojects
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async store({ auth, request, response }) {
    const searchProjectData = request.only(['name', 'is_private']);
    const inventoryData = request.only(['candidates', 'hiring_authorities', 'names', 'job_orders']);
    const queryParams = request.only([
      'candidate_query',
      'joborder_query',
      'name_query',
      'search_project_id',
      'search_params',
    ]);

    const result = await SearchProjectRepository.create(
      searchProjectData,
      inventoryData,
      auth.current.user.id,
      queryParams
    );

    return response.status(result.code).send(result.success ? result.data : result);
  }

  /**
   * Display the inventory of one search project.
   * GET searchprojects/:id
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async showInventory({ auth, params, request, response }) {
    const filters = request.only([
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
    const paginationData = request.only(['page', 'perPage', 'orderBy', 'direction']);
    const keyword = request.input('keyword');
    const userId = auth.current.user.id;
    const id = params.id;

    const result = await SearchProjectInventoryRepository.details(filters, paginationData, keyword, id, userId);

    return response.status(result.code).send(result.success ? result.data : result);
  }

  /**
   * Display the search project name & total_items
   * GET searchprojects/:id
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async showQuickInfo({ auth, params, request, response }) {
    const result = await SearchProjectInventoryRepository.quickInfo(params.id, auth.current.user.id);

    return response.status(result.code).send(result.success ? result.data : result);
  }

  /**
   * Update searchproject details.
   * PUT or PATCH searchprojects/:id
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async update({ params, auth, request, response }) {
    const searchProjectData = request.only(['name', 'isPrivate', 'ownerId']);
    const result = await SearchProjectRepository.update(params.id, searchProjectData, auth.current.user.id);

    return response.status(result.code).send(result.success ? result.data : result);
  }

  /**
   * Update searchproject inventory.
   * PUT or PATCH searchprojects/:id/inventory
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async updateInventory({ params, auth, request, response }) {
    const inventoryData = request.only(['candidates', 'hiring_authorities', 'names', 'job_orders']);
    const queryParams = request.only([
      'candidate_query',
      'joborder_query',
      'name_query',
      'search_project_id',
      'search_params',
    ]);

    const result = await SearchProjectInventoryRepository.update(
      params.id,
      inventoryData,
      auth.current.user.id,
      queryParams
    );

    return response.status(result.code).send(result.success ? result.data : result);
  }

  /**
   * Delete a searchproject item with a id.
   * DELETE searchprojects/:id/inventory
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async destroyInventory({ params, auth, request, response }) {
    const searchProjectId = params.id;
    const inventoryData = request.only(['candidates', 'hiring_authorities', 'names', 'search_params']);
    const userId = auth.current.user.id;

    const result = await SearchProjectInventoryRepository.delete(searchProjectId, inventoryData, userId);

    return response.status(result.code).send(result.success ? result.data : result);
  }

  /**
   * Delete a searchproject with the id
   * DELETE searchprojects/:id
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async destroy({ params, auth, response }) {
    const result = await SearchProjectRepository.delete(params.id, auth.current.user.id);

    return response.status(result.code).send(result.success ? result.data : result);
  }

  /**
   * Returns the Searchs without inventory of a user
   * GET indexUser
   * @method indexUser
   *
   * @param {object} ctx
   * @param {Response} ctx.response
   */
  async indexUser({ params, response }) {
    const result = await SearchProjectRepository.byUser(params.id);

    return response.status(result.code).send(result.success ? result.data : result);
  }
}

module.exports = SearchProjectController;
