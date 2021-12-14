'use strict';

//Models
const EmailTrackingBlockList = use('App/Models/EmailTrackingBlockList');
const EmailTrackingBlockListChangeLog = use('App/Models/EmailTrackingBlockListChangeLog');

//Utils
const appInsights = require('applicationinsights');
const Antl = use('Antl');
const { OperationType, EntityTypes } = use('App/Helpers/Globals');
const { multipleFilterParser, defaultWhereResolver, multipleWhereResolver, applyOrderClause } = use(
  'App/Helpers/QueryFilteringUtil'
);
const Event = use('Event');
const EventTypes = use('App/Helpers/Events');

class EmailTrackingBlockListRepository {
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
      userId: buildDefaultWhereFilterEntry('created_by'),
      blockTo: buildDefaultWhereFilterEntry('block_to'),
      blockFrom: buildDefaultWhereFilterEntry('block_from'),

      usersId: buildDefaultMultipleFilterEntry('created_by'),
    };

    this._orderColumnsMap = {
      email: 'email',
      block_to: 'block_to',
      block_from: 'block_from',
      created_by: 'created_by',
    };
  }

  /**
   * Returns all the available email tracking block rules
   *
   * @description Use this when you want to index the available email tracking block rules
   *
   * @param {String} email - The email that will have the new rule
   *
   * @returns {Object} An object with a code & success status, with a data or message
   */
  async listing(filters, paginationData, keyword = null) {
    try {
      const { page = 1, perPage = 10, orderBy, direction } = paginationData;

      const query = EmailTrackingBlockList.query()
        .select(['email_tracking_block_lists.*', 'users.user_name'])
        .leftJoin('v_users as users', 'users.id', 'email_tracking_block_lists.created_by');

      if (keyword) query.where('email', 'ilike', `%${keyword}%`);

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
        message: Antl.formatMessage('messages.error.internalServer', {
          action: 'deleting',
          entity: 'email block rule',
        }),
      };
    }
  }

  /**
   * Creates an email tracking block rule
   *
   * @description Use this when a new email tracking block is being created
   *
   * @param {String} email - The email that will have the new rule
   * @param {Object} blockData - The blockData being applied
   * @param {Boolean} blockData.to - If the rule will apply to the 'to'
   * @param {Boolean} blockData.from - If the rule will apply to the 'from'
   * @param {Number} userId - The user applying the rule
   *
   * @returns {Object} An object with a code & success status, with a data or message
   */
  async create(email, blockData, userId) {
    try {
      const { to = true, from = true, notes } = blockData;
      const formatedEmail = String(email).formatToCompare();

      const emailExists = await EmailTrackingBlockList.query().where({ email: formatedEmail }).first();
      if (emailExists) {
        return {
          success: false,
          code: 409,
          message: Antl.formatMessage('messages.error.duplicate', { entity: 'email block rule' }),
        };
      }

      const emailTrackingBlock = await EmailTrackingBlockList.create({
        email: formatedEmail,
        block_to: to,
        block_from: from,
        notes,
        created_by: userId,
      });

      Event.fire(EventTypes.EmailTrackingBlock.Created, {
        email,
        entity: EntityTypes.EmailTrackingBlock,
        operation: OperationType.Create,
        payload: { sent: { email, blockData }, result: emailTrackingBlock, userId },
        userId,
      });

      return {
        success: true,
        code: 201,
        data: emailTrackingBlock,
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
      return {
        success: false,
        code: 500,
        message: Antl.formatMessage('messages.error.internalServer', {
          action: 'creating',
          entity: 'email block rule',
        }),
      };
    }
  }

  /**
   * Deletes an email tracking block rule
   *
   * @description Use this when an email tracking block is being deleted
   *
   * @param {String} email - The email that will have the new rule
   *
   * @returns {Object} An object with a code & success status, with a data or message
   */
  async delete(id, userId) {
    try {
      const emailTrackingBlock = await EmailTrackingBlockList.findBy({ id });

      if (!emailTrackingBlock) {
        return {
          success: false,
          code: 404,
          message: Antl.formatMessage('messages.error.notFound', { entity: 'email block rule' }),
        };
      }

      const result = await EmailTrackingBlockList.query().where({ id }).delete();

      Event.fire(EventTypes.EmailTrackingBlock.Deleted, {
        email: emailTrackingBlock.email,
        entity: EntityTypes.EmailTrackingBlock,
        operation: OperationType.Delete,
        payload: { sent: { id }, result, userId },
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
          action: 'deleting',
          entity: 'email block rule',
        }),
      };
    }
  }

  /**
   * Log a block rule change
   *
   * @method logChange
   *
   * @description Use this whenever a change is made to a block rule & is deemed important to record in the audit trail
   *
   * @param {Number} companyId - The company that suffered the change
   * @param {String} entity - What changed in the block rule
   * @param {String} operation - Related operation (create, update, delete)
   * @param {Object} payload - Content of the changed object
   * @param {Number} userId - Who made the change
   */
  async logChange(email, entity, operation, payload, userId) {
    try {
      await EmailTrackingBlockListChangeLog.create({
        email,
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
}

module.exports = EmailTrackingBlockListRepository;
