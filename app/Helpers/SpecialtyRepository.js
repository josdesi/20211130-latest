'use strict';

//Utils
const Database = use('Database');
const Antl = use('Antl');
const CustomString = use('App/Utils/CustomString');

//Models
const Specialty = use('App/Models/Specialty');

//Repositories
const SubspecialtyRepository = new (use('App/Helpers/SubspecialtyRepository'))();
const PositionRepository = new (use('App/Helpers/PositionRepository'))();

class SpecialtyRepository {
  /**
   * @method create
   *
   * @param {String} title
   * @param {String} email
   * @param {Object} specialties
   * @param {Integer} userId
   * @param {Transaction} trx
   *
   */
  async create(industryId, title, subspecialties = [], positions = [], userId, trx) {
    const specialty = await Specialty.create(
      {
        industry_id: industryId,
        title,
        created_by: userId,
        updated_by: userId,
      },
      trx
    );

    const resSubspecialties = await this.updateOrCreateSubspecialties(subspecialties, specialty.id, userId, trx);
    if (!resSubspecialties.success) return resSubspecialties;

    const resPositions = await this.updateOrCreatePositions(
      positions,
      specialty.id,
      specialty.industry_id,
      userId,
      trx
    );
    if (!resPositions.success) return resPositions;

    return {
      success: true,
    };
  }

  /**
   * @method update
   *
   * @param {String} specialtyId
   * @param {String} title
   * @param {Array} subspecialties
   * @param {Array} positions
   * @param {Integer} userId
   * @param {Transaction} trx
   *
   */
  async update(specialtyId, title, subspecialties = [], positions = [], userId, trx) {
    const specialty = await Specialty.find(specialtyId);
    if (!specialty) {
      return {
        success: false,
        code: 404,
        message: Antl.formatMessage('messages.error.notFound', { entity: 'Specialty' }),
      };
    }
    if (!CustomString(title).isEqualTo(specialty.title)) {
      specialty.merge({ title, updated_by: userId });
      await specialty.save(trx);
      await this.updateContactsSpecialty(title, specialty.id, trx);
    }
    const resSubspecialties = await this.updateOrCreateSubspecialties(subspecialties, specialty.id, userId, trx);
    if (!resSubspecialties.success) return resSubspecialties;

    const resPositions = await this.updateOrCreatePositions(
      positions,
      specialty.id,
      specialty.industry_id,
      userId,
      trx
    );
    if (!resPositions.success) return resPositions;

    return {
      success: true,
    };
  }

  async updateOrCreateSubspecialties(subspecialties = [], specialtyId, userId, trx) {
    for (const subspecialty of subspecialties) {
      const { id, title } = subspecialty;
      const resSubspecialty = id
        ? await SubspecialtyRepository.update(id, title, userId, trx)
        : await SubspecialtyRepository.create(specialtyId, title, userId, trx);
      if (!resSubspecialty.success) return resUpdate;
    }
    return {
      success: true,
    };
  }

  async updateOrCreatePositions(positions = [], specialtyId, industryId, userId, trx) {
    for (const position of positions) {
      const { id, title } = position;
      const resPosition = id
        ? await PositionRepository.update(id, title, userId, trx)
        : await PositionRepository.create(industryId, specialtyId, title, userId, trx);
      if (!resPosition.success) return resUpdate;
    }
    return {
      success: true,
    };
  }

  async refreshView() {
    await Database.raw(`SELECT fp_refresh_v_specialties()`);
  }

  async updateContactsSpecialty(title, specialtyId, trx) {
    await trx.raw(
      `UPDATE contacts_directory SET specialty = :specialtyTitle, industry_specialty = industry || ': ' || :specialtyTitle where specialty_id = :specialtyId`,
      {
        specialtyTitle: title,
        specialtyId,
      }
    );
  }
}

module.exports = SpecialtyRepository;
