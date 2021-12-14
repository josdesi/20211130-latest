'use strict';

const appInsights = require('applicationinsights');
const Antl = use('Antl');

const SendoutRepository = use('App/Helpers/SendoutRepository');

/** @typedef {import('@adonisjs/framework/src/Request')} Request */
/** @typedef {import('@adonisjs/framework/src/Response')} Response */

/**
 * Resourceful controller for interacting with sendouts
 */
class SendoutController {
  constructor() {
    this.sendoutRepository = new SendoutRepository();
  }

  /**
   * Show a list of all sendouts.
   * GET sendouts
   *
   * @param {object} ctx
   * @param {Auth} ctx.auth
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async index({ auth, request, response }) {
    const offset = request.header('Timezone');
    const result = await this.sendoutRepository.listing(request.all(), auth.current.user.id, offset);

    if (result.success && result.data) {
      return response.status(result.code).send(result.data);
    }

    return response.status(result.code).send(result);
  }

  /**
   * Returns a summary of sendouts.
   * GET sendouts/summary
   *
   * @param {object} ctx
   * @param {Auth} ctx.auth
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async summary({ auth, request, response }) {
    const offset = request.header('Timezone');
    const userId = auth.current.user.id;
    const result = await this.sendoutRepository.summary(request.all(), userId, offset);

    if (result.success && result.data) {
      return response.status(result.code).send(result.data);
    }

    return response.status(result.code).send(result);
  }

  /**
   * Returns a dashboard of sendouts.
   * GET sendouts/dashboard
   *
   * @param {object} ctx
   * @param {Auth} ctx.auth
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
   async dashboard({ request, response }) {    
    const result = await this.sendoutRepository.dashboard(request.all());
    return response.status(result.code).send(result.data || result);
  }


  /**
   * Returns a dashboard of sendouts.
   * GET sendouts/dashboard/weeks
   *
   * @param {object} ctx
   * @param {Response} ctx.response
   */
   async dashboardWeeks({ response }) {
    
    const result = await this.sendoutRepository.dashboardWeeks();
    return response.status(result.code).send(result.data || result);
  }

  /**
   * Returns a dashboard of sendouts.
   * GET sendouts/dashboard/recruiters
   *
   * @param {object} ctx
   * @param {Auth} ctx.auth
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
   async dashboardRecruiters({ request, response }) {    
    const result = await this.sendoutRepository.dashboardRecruiters(request.all());
    return response.status(result.code).send(result.data || result);
  }

  /**
   * Returns a board of sendouts.
   * GET sendouts/board
   *
   * @param {object} ctx
   * @param {Response} ctx.response
   */
  async board({ response }) {
    const result = await this.sendoutRepository.getBoard();
    return result.success && result.data
      ? response.status(result.code).send(result.data)
      : response.status(result.code).send(result);
  }

  /**
   * Create/save a new sendout.
   * POST sendouts
   *
   * @param {object} ctx
   * @param {Auth} ctx.auth
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async store({ auth, request, response }) {
    const timezone = request.header('Timezone');
    const result = await this.sendoutRepository.create(request.all(), auth.current.user.id, timezone);

    return response.status(result.code).send(result);
  }

  /**
   * Display a single sendout.
   * GET sendouts/:id
   *
   * @param {object} ctx
   * @param {Params} ctx.params
   * @param {Response} ctx.response
   */
  async show({ params, response, request }) {
    try {
      const { scopes = [], relations = [] } = request.only(['scopes', 'relations']);
      const sendout = await this.sendoutRepository.details(params.id, [
        ...relations,
        ...this.sendoutRepository.defaultRelations,
        ...scopes,
      ]);

      if (!sendout) {
        return response.status(404).send({
          message: Antl.formatMessage('messages.error.notFound', {
            entity: 'Sendout',
          }),
        });
      }

      return response.status(200).send(sendout);
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      return response.status(500).send({
        message: Antl.formatMessage('messages.error.internalServer', {
          action: 'retrieving',
          entity: 'Sendout',
        }),
      });
    }
  }

  /**
   * Update sendout details.
   * PUT or PATCH sendouts/:id
   *
   * @param {object} ctx
   * @param {Auth} ctx.auth
   * @param {Params} ctx.params
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async update({ auth, params, request, response }) {
    const timezone = request.header('Timezone');

    const result = await this.sendoutRepository.update(params, request.all(), auth.current.user.id, timezone);

    return response.status(result.code).send(result.success ? result.data : result);
  }

  /**
   * Delete a sendout with id.
   * DELETE sendouts/:id
   *
   * @param {object} ctx
   * @param {Params} ctx.params
   * @param {Response} ctx.response
   * @param {Auth} ctx.auth
   */
  async destroy({ params, response, auth }) {
    const result = await this.sendoutRepository.remove(params, auth.current.user.id);

    return response.status(result.code).send(result);
  }

  /**
   * Show a list of all sendout types.
   * GET sendouts/types
   *
   * @param {object} ctx
   * @param {Response} ctx.response
   */
  async types({ response }) {
    const result = await this.sendoutRepository.listingSendoutTypes();

    return response.status(result.code).send(result.success ? result.data : result);
  }

  /**
   * Show a list of all statuses by types.
   * GET sendouts/statuses
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async statuses({ request, response }) {
    const result = await this.sendoutRepository.listingSendoutStatuses(request.all());

    return response.status(result.code).send(result.success ? result.data : result);
  }

  /**
   * Show a list of all interview types.
   * GET sendouts/interviewTypes
   *
   * @param {object} ctx
   * @param {Response} ctx.response
   */
  async interviewTypes({ response }) {
    const result = await this.sendoutRepository.listingSendoutInterviewTypes();

    return response.status(result.code).send(result.success ? result.data : result);
  }

  /**
   * Show a list of all sendout templates.
   * GET sendouts/template
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async template({ request, response }) {
    const result = await this.sendoutRepository.listingSendoutTemplates(request.all());

    return response.status(result.code).send(result.success ? result.data : result);
  }

  /**
   * Convert sendover to sendout.
   * PUT or PATCH sendouts/:id
   *
   * @param {object} ctx
   * @param {Auth} ctx.auth
   * @param {Params} ctx.params
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async convertSendoverToSendout({ auth, params, request, response }) {
    const timezone = request.header('Timezone');
    const result = await this.sendoutRepository.convertSendoverToSendout(
      params,
      request.all(),
      auth.current.user.id,
      timezone
    );

    return response.status(result.code).send(result.success ? result.data : result);
  }

  /**
   * Show a list of all file types to create a placement.
   * GET /:id/file-types-to-create-placement
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async fileTypesForPlacement({ params, response }) {
    const result = await this.sendoutRepository.fileTypesForPlacement(params.id);

    return response.status(result.code).send(result.success ? result.data : result);
  }

  /**
   * Returns the list of placements for a sendout
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
    const result = await this.sendoutRepository.getPlacements(params.id);
    return response.status(result.code).send(result.data || result);
  }

  /**
   * Returns the configuration of Sendout Board from ModulePresetConfigs
   *
   * @param {object} ctx.
   * @param {Response} ctx.response
   *
   *
   * @return {Object} Message or success or an error code
   */
  async boardConfiguration({ response }) {
    const config = await this.sendoutRepository.getBoardConfiguration();
    return response.status(config.code).send(config.data || config);
  }

  /**
   * Send a list of unconverted Sendovers for last N days taken from configuration
   *
   * @method   async sendUnconvertedSendovers({ response }) {
   *
   * @param {Response} ctx.response
   *
   *
   * @return {Object} Email response from Email provider
   */
  async sendUnconvertedSendovers({ response }) {
    try {
      const emailResponse = await this.sendoutRepository.sendUnconvertedSendovers();
      if (!emailResponse.success) throw emailResponse.message || `Unexpected error while sending unconverted sendovers`;

      return response.status(200).send(emailResponse);
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
      return response.status(500).send({
        message: Antl.formatMessage('messages.error.internalServer', {
          action: 'sending',
          entity: 'uncoverted sendovers',
        }),
      });
    }
  }

  /**
   * Send email daily sendout leaders.
   * GET sendouts/send-daily-leaders
   *
   * @param {object} ctx
   * @param {Response} ctx.response
   *
   * @return {Object} Email response from Email provider
   */
  async sendDailyLeaders({ response }) {
    try {
      const emailResponse = await this.sendoutRepository.sendDailyLeaders();
      if (!emailResponse.success)
        throw emailResponse.message || `Unexpected error while sending daily leaders sendouts`;
      return response.status(200).send(emailResponse);
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
      return response.status(500).send({
        message: Antl.formatMessage('messages.error.internalServer', {
          action: 'sending',
          entity: 'daily leaders sendouts',
        }),
      });
    }
  }

  /**
   *
   * GET sendouts/cut-off-board-weekly
   *
   * @param {object} ctx
   * @param {Response} ctx.response
   *
   * @return {Object}
   */
  async cutOffBoardWeekly({ response }) {
    try {
      const cutOffResponse = await this.sendoutRepository.cutOffBoardWeekly();
      if (!cutOffResponse.success) throw cutOffResponse.message || `Unexpected error while cut off weekly sendouts`;
      return response.status(200).send(cutOffResponse);
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
      return response.status(500).send({
        message: Antl.formatMessage('messages.error.internalServer', {
          action: 'cut off',
          entity: 'weekly sendouts',
        }),
      });
    }
  }

  /**
   *
   * GET sendouts/cut-off-goal-weekly
   *
   * @param {object} ctx
   * @param {Response} ctx.response
   *
   * @return {Object}
   */
  async cutOffGoalWeekly({ response }) {
    try {
      const cutOffResponse = await this.sendoutRepository.cutOffGoalWeekly();
      if (!cutOffResponse.success) throw cutOffResponse.message || `Unexpected error while cut off goal sendouts`;
      return response.status(200).send(cutOffResponse);
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
      return response.status(500).send({
        message: Antl.formatMessage('messages.error.internalServer', {
          action: 'cut off',
          entity: 'goal sendouts',
        }),
      });
    }
  }
}

module.exports = SendoutController;
