'use strict';

//Utils
const Antl = use('Antl');
const Database = use('Database');
const appInsights = require('applicationinsights');
const CustomString = use('App/Utils/CustomString');

//Models
const Position = use('App/Models/Position');
const CommonPosition = use('App/Models/CommonPosition');
class PositionRepository {
  /**
   * @method create
   *
   * @param {Integer} industryId
   * @param {Integer} specialtyId
   * @param {String} title
   * @param {Integer} userId
   * @param {Transaction} trx
   *
   */
  async create(industryId, specialtyId, title, userId, trx) {
    await Position.create(
      {
        industry_id: industryId,
        specialty_id: specialtyId,
        title,
        created_by: userId,
        updated_by: userId,
      },
      trx
    );
    return {
      success: true,
    };
  }

  /**
   * @method update
   *
   * @param {Integer} positionId
   * @param {String} title
   * @param {Integer} userId
   * @param {Transaction} trx
   *
   */
  async update(positionId, title, userId, trx) {
    const position = await Position.find(positionId);
    if (!position) {
      return {
        success: false,
        code: 404,
        message: Antl.formatMessage('messages.error.notFound', { entity: 'Position' }),
      };
    }
    if (!CustomString(title).isEqualTo(position.title)) {
      position.merge({ title, updated_by: userId });
      await position.save(trx);
      await this.updateContactsPosition(title, position.id, trx);
    }
    return {
      success: true,
    };
  }

  async refreshView() {
    await Database.raw(`SELECT fp_refresh_v_positions()`);
  }

  async updateContactsPosition(title, positionIds, trx) {
    const isArray = Array.isArray(positionIds);
    await trx
      .table('contacts_directory')
      .where((builder) =>
        isArray ? builder.whereIn('position_id', positionIds) : builder.where({ position_id: positionIds })
      )
      .update('position', title);
  }

  /**
   * @method saveCommon
   *
   * @param {Array} updated
   * @param {Array} added
   * @param {Array} deleted
   *
   */
  async saveCommon(updated = [], added = [], deleted = []) {
    const trx = await Database.beginTransaction();
    try {
      const tableRelation = 'common_positions';
      for (const item of updated) {
        const positionToUpdate = await CommonPosition.find(item.id);
        await trx.table(tableRelation).where({ id: item.id }).update({ title: item.title });
        const updatedPositionIds = await trx
          .table('positions')
          .returning('id')
          .whereRaw('LOWER(title) = ?', [CustomString(positionToUpdate.title).toCompare()])
          .update({ title: item.title });
        await this.updateContactsPosition(item.title, updatedPositionIds, trx);
      }
      for (const item of deleted) {
        await trx.table(tableRelation).where({ id: item.id }).delete();
      }
      for (const item of added) {
        await trx.table(tableRelation).insert({ title: item.title });
      }

      await trx.commit();

      const positions = await CommonPosition.query().orderBy('title').fetch();

      if (updated.length > 0) {
        await this.refreshView();
      }

      return {
        success: true,
        message: Antl.formatMessage('messages.success.update', { entity: 'positions' }),
        code: 201,
        data: positions,
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      await trx.rollback();
      return {
        success: false,
        code: 500,
        message: Antl.formatMessage('messages.error.internalServer', { action: 'saving', entity: 'positions' }),
      };
    }
  }
}

module.exports = PositionRepository;
