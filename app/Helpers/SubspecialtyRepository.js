'use strict';

//Utils
const Database = use('Database');
const CustomString = use('App/Utils/CustomString');

//Models
const Subspecialty = use('App/Models/Subspecialty');

class SubspecialtyRepository {
  /**
   * @method create
   *
   * @param {Integer} specialtyId
   * @param {String} title
   * @param {Integer} userId
   * @param {Transaction} trx
   *
   */
  async create(specialtyId, title, userId, trx) {
    await Subspecialty.create(
      {
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
   * @param {Integer} subspecialtyId
   * @param {String} title
   * @param {Integer} userId
   * @param {Transaction} trx
   *
   */
  async update(subspecialtyId, title, userId, trx) {
    const subspecialty = await Subspecialty.find(subspecialtyId);
    if (!subspecialty) {
      return {
        success: false,
        code: 404,
        message: Antl.formatMessage('messages.error.notFound', { entity: 'Subspecialty' }),
      };
    }
    if (!CustomString(title).isEqualTo(subspecialty.title)) {
      subspecialty.merge({ title, updated_by: userId });
      await subspecialty.save(trx);
      await this.updateContactsSubspecialty(title, subspecialty.id, trx);
    }
    return {
      success: true,
    };
  }

  async refreshView() {
    await Database.raw(`SELECT fp_refresh_v_subspecialties()`);
  }

  async updateContactsSubspecialty(title, subspecialtyId, trx) {
    await trx.table('contacts_directory').where({ subspecialty_id: subspecialtyId }).update('subspecialty', title);
  }
}

module.exports = SubspecialtyRepository;
