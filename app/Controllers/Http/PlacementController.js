'use strict';

// Utils
const appInsights = require('applicationinsights');
const Antl = use('Antl');

// Repositories
const PlacementRepository = new (use('App/Helpers/PlacementRepository'))();

//Models
const PlacementStatus = use('App/Models/PlacementStatus');
const PlacementFallOffReason = use('App/Models/PlacementFallOffReason');
class PlacementController {
  /**
   * Show a list of all placements.
   * GET placements
   *
   * @param {object} ctx
   * @param {Auth} ctx.auth
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async index({ auth, request, response }) {
    const offset = request.header('Timezone');
    const result = await PlacementRepository.listing(request.all(), auth.current.user.id, offset);

    if (result.success && result.data) {
      return response.status(result.code).send(result.data);
    }

    return response.status(result.code).send(result);
  }

  /**
   * Returns a summary of placements.
   * GET placements/summary
   *
   * @param {object} ctx
   * @param {Auth} ctx.auth
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async summary({ auth, request, response }) {
    const offset = request.header('Timezone');

    const result = await PlacementRepository.summary(request.all(), auth.current.user.id, offset);

    if (result.success && result.data) {
      return response.status(result.code).send(result.data);
    }

    return response.status(result.code).send(result);
  }

  /**
   * Creates a Placement.
   * POST placements
   *
   * @method store
   *
   * @param {Authentication} ctx.auth
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   *
   * @return {Object} Created Placement with a succes message or an error code
   *
   */
  async store({ auth, request, response }) {
    const sendout_id = request.input('sendout_id');
    const placementData = request.only([
      'splits', 
      'files', 
      'notes',
      'source_type_id',
      'job_order_source_type_id',
      'additional_invoice_recipients',
      'payment_details'
    ]);
    const fee_info = request.only([
      'fee_agreement_payment_scheme_id',
      'fee_amount',
      'fee_percentage',
      'service_months',
      'first_year_value',
      'start_date',
      'guarantee_days',
      'company_fee_agreement_id',
      'monthly_amount'
    ]);
    const result = await PlacementRepository.create(sendout_id, fee_info, placementData, auth.current.user.id);
    return response.status(result.code).send(result);
  }

  /**
   * Returns a single placement.
   * GET placements/:id
   *
   * @method show
   *
   * @param {object} ctx
   * @param {Response} ctx.response
   *
   * @return {Object} Response with the placement object or an error
   */
  async show({ params, response, request }) {
    try {
      const { relations = [] } = request.only(['relations']);
      const placement = await PlacementRepository.details(params.id, [
        ...relations,
        ...PlacementRepository.defaultRelations,
      ]);

      if (!placement) {
        return response.status(404).send({
          message: Antl.formatMessage('messages.error.notFound', { entity: 'Placement' }),
        });
      }
      return response.status(200).send(placement);
    } catch (error) {
      console.log(error)
      appInsights.defaultClient.trackException({ exception: error });
      return response.status(500).send({
        message: Antl.formatMessage('messages.error.internalServer', { action: 'getting', entity: 'placement info' }),
      });
    }
  }

  /**
   * Update placement details.
   * PUT  placements/:id
   *
   * @method update
   *
   * @param {Authentication} ctx.auth
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   *
   * @return Response with the updated placement or an error
   */
  async update({ auth, params, request, response }) {
    const placementData = request.only([
      'splits', 
      'files', 
      'notes', 
      'isFinanceAdjusting',
      'source_type_id',
      'job_order_source_type_id',
      'additional_invoice_recipients',
      'payment_details'
    ]);
    const feeData = request.only([
      'fee_agreement_payment_scheme_id',
      'fee_amount',
      'fee_percentage',
      'service_months',
      'first_year_value',
      'start_date',
      'guarantee_days',
      'monthly_amount'
    ]);
    const result = await PlacementRepository.update(params.id, feeData, placementData, auth.current.user.id);

    return response.status(result.code).send(result.data || result);
  }

  /**
   * Creates an update suggestion.
   * POST update
   *
   * @method store
   *
   * @param {Authentication} ctx.auth
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   *
   * @return {Object} Created Suggestion with a succes message or an error code
   *
   */
  async suggestAnUpdate({ auth, params, request, response }) {
    const description = request.input(['description']);
    const result = await PlacementRepository.createASuggestion(params.id, description, auth.current.user.id);
    return response.status(result.code).send(result);
  }

  /**
   * Creates a Placement Invoice.
   * POST placements/invoices
   *
   * @method storeInvoice
   *
   * @param {Authentication} ctx.auth
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   *
   * @return {Object} Created Placement Invoice with a succes message or an error code
   *
   */
  async storeInvoice({ auth, request, response, params }) {
    const { invoice_number } = request.only(['invoice_number']);

    const result = await PlacementRepository.createInvoice(params.id, invoice_number, auth.current.user.id);
    return response.status(result.code).send(result);
  }

  /**
   * Updates a Placement Invoice.
   * PUT/PATCH placements/invoices/:id
   *
   * @method updateInvoice
   *
   * @param {Authentication} ctx.auth
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   *
   * @return {Object} Updates Placement Invoice with a succes message or an error code
   *
   */
  async updateInvoice({ auth, request, response, params }) {
    const invoice_number = request.input(['invoice_number']);

    const result = await PlacementRepository.updateInvoice(params.id, invoice_number, auth.current.user.id);
    return response.status(result.code).send(result);
  }

  /**
   * Deletes a Placement Invoice.
   * DELETE placements/invoices/:id
   *
   * @method deleteInvoice
   *
   * @param {Response} ctx.response
   *
   * @return {Object} Deleted Placement Invoice with a succes message or an error code
   *
   */
  async deleteInvoice({ response, params, auth }) {
    const result = await PlacementRepository.deleteInvoice(params.id, auth.current.user.id);
    return response.status(result.code).send(result);
  }

  /**
   * GET Placement Invoices.
   * GET placements/:id/invoices
   *
   * @method invoices
   *
   * @param {Response} ctx.response
   *
   * @return {Object} Placement Invoices with a succes message or an error code
   *
   */
  async invoices({ response, params }) {
    const result = await PlacementRepository.getInvoices(params.id);

    if (result.success && result.data) {
      return response.status(result.code).send(result.data);
    }

    return response.status(result.code).send(result);
  }

    /**
   * Creates a Placement Payment.
   * POST placements/payments
   *
   * @method storePayment
   *
   * @param {Authentication} ctx.auth
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   *
   * @return {Object} Created Placement Payment with a succes message or an error code
   *
   */
     async storePayment({ auth, request, response, params }) {
      const { amount } = request.only(['amount']);
  
      const result = await PlacementRepository.createPayment(params.id, amount, auth.current.user.id);
      return response.status(result.code).send(result);
    }
  
    /**
     * Updates a Placement Payment.
     * PUT/PATCH placements/payments/:id
     *
     * @method updatePayment
     *
     * @param {Authentication} ctx.auth
     * @param {Request} ctx.request
     * @param {Response} ctx.response
     *
     * @return {Object} Updates Placement Payment with a succes message or an error code
     *
     */
    async updatePayment({ auth, request, response, params }) {
      const amount = request.input(['amount']);
  
      const result = await PlacementRepository.updatePayment(params.id, amount, auth.current.user.id);
      return response.status(result.code).send(result);
    }
  
    /**
     * Deletes a Placement Payment.
     * DELETE placements/invoices/:id
     *
     * @method deletePayment
     *
     * @param {Response} ctx.response
     *
     * @return {Object} Deleted Placement Payment with a succes message or an error code
     *
     */
    async deletePayment({ response, params, auth }) {
      const result = await PlacementRepository.deletePayment(params.id, auth.current.user.id);
      return response.status(result.code).send(result);
    }
  
    /**
     * GET Placement Payments.
     * GET placements/:id/payments
     *
     * @method payments
     *
     * @param {Response} ctx.response
     *
     * @return {Object} Placement Payment with a succes message or an error code
     *
     */
    async payments({ response, params }) {
      const result = await PlacementRepository.getPayments(params.id);
  
      if (result.success && result.data) {
        return response.status(result.code).send(result.data);
      }
  
      return response.status(result.code).send(result);
    }

    /**
   * Show a list of all placements statuses.
   * GET placements/statuses
   *

   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async getStatuses({  request, response }) {
    try {
      const status = await PlacementStatus.all();
      return response.ok(status);
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
      return response.status(500).send({
        message: Antl.formatMessage('messages.error.internalServer', { action: 'getting', entity: 'statuses' }),
      });
    }
  }

  /**
   * Show a list of all placements logs.
   * GET placements/:id/logs
   *
   * @param {Response} ctx.response
   */
  async getChangeLogs({ params, response }) {
    const result = await PlacementRepository.getLogs(params.id);
  
    if (result.success && result.data) {
      return response.status(result.code).send(result.data);
    }

    return response.status(result.code).send(result);
  }

  
    /**
   * Show a list of all placements fall off reasons.
   * GET placements/fallOffReasons
   *

   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
    async getFallOffReasons({  request, response }) {
    try {
      const reasons = await PlacementFallOffReason.query().orderBy('order').fetch();
      return response.ok(reasons);
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
      return response.status(500).send({
        message: Antl.formatMessage('messages.error.internalServer', { action: 'getting', entity: 'fall off reasons' }),
      });
    }
  }

    /**
   * Request to mark a placement as fall off.
   * PUT placements/:id/requestFallOff
   *
   * @method storeInvoice
   *
   * @param {Authentication} ctx.auth
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   *
   * @return {Object} 
   *
   */
  async requestFallOff({ auth, request, response, params }) {
    const fallOffParams = request.only([
      'placement_fall_off_reason_id',
      'fall_off_reason',
      'candidate_still_available',
      'job_still_open'
    ]);

    const result = await PlacementRepository.requestFallOff(params.id, fallOffParams, auth.current.user.id);

    return response.status(result.code).send(result.data || result);
  }

  /**
   * Marks a Placement as FallOff.
   * PUT placements/:id/markAsFallOff
   *
   * @method storeInvoice
   *
   * @param {Authentication} ctx.auth
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   *
   * @return {Object} 
   *
   */
  async markAsFallOff({ auth, response, params }) {
    const result = await PlacementRepository.markAsFallOff(params.id, auth.current.user.id);

    return response.status(result.code).send(result.data || result);
  }


    /**
   * Request the Revert pf a fall off to a placement.
   * PUT placements/:id/requestRevertFallOff
   *
   * @method storeInvoice
   *
   * @param {Authentication} ctx.auth
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   *
   * @return {Object} 
   *
   */
  async requestRevertFallOff({ auth, response, params }) {
    const result = await PlacementRepository.requestRevertFallOff(params.id, auth.current.user.id);

    return response.status(result.code).send(result.data || result);
  }


   /**
   * Reverts a fall off to a placement.
   * PUT placements/:id/revertFallOff
   *
   * @method storeInvoice
   *
   * @param {Authentication} ctx.auth
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   *
   * @return {Object} 
   *
   */
  async revertFallOff({ auth, response, params }) {
    const result = await PlacementRepository.revertFallOff(params.id, auth.current.user.id);

    return response.status(result.code).send(result.data || result);
  }

   /**
   * Show a list of all placements available to 
   * start processing
   * 
   * GET placements/forEstimate
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async getAvailableToProcessEstimation({ request, response }){
    const params = request.only(['statusIds','limit']);
    const result = await PlacementRepository.listForEstimation(params);

    return response.status(result.code).send(result.data || result);
  }
}

module.exports = PlacementController;
