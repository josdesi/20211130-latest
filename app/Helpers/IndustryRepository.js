'use strict';

//Utils
const Antl = use('Antl');
const Database = use('Database');
const appInsights = require('applicationinsights');
const CustomString = use('App/Utils/CustomString');

//Models
const Industry = use('App/Models/Industry');

//Repositories
const SpecialtyRepository = new (use('App/Helpers/SpecialtyRepository'))();
const SubspecialtyRepository = new (use('App/Helpers/SubspecialtyRepository'))();
const PositionRepository = new (use('App/Helpers/PositionRepository'))();

class IndustryRepository {
  /**
   * Returns a custom response that determines
   * the creation of an industry
   *
   * @method create
   *
   * @param {String} title
   * @param {String} email
   * @param {Object} specialties
   * @param {Integer} userId
   *
   * @return {Object} A success with a code 200 and message or a message error with an error code
   *
   */
  async create(title, email, specialties = [], userId) {
    const trx = await Database.beginTransaction();
    try {
      const industry = await Industry.create({ title, email, created_by: userId, updated_by: userId }, trx);

      const resSpecialties = await this.updateOrCreateSpecialties(specialties, industry.id, userId, trx);
      if (!resSpecialties.success) {
        await trx.rollback();
        return resSpecialties;
      }

      await trx.commit();
      await this.refreshViews();

      await industry.load('specialties');
      return {
        success: true,
        message: Antl.formatMessage('messages.success.creation', { entity: 'Industry' }),
        code: 201,
        data: industry,
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      await trx.rollback();
      return {
        success: false,
        code: 500,
        message: Antl.formatMessage('messages.error.internalServer', { action: 'creating', entity: 'industry' }),
      };
    }
  }

  /**
   * Returns a custom response that determines
   * the creation of an industry
   *
   * @method create
   *
   * @param {String} title
   * @param {String} email
   * @param {Object} specialties
   * @param {Integer} userId
   *
   * @return {Object} A success with a code 200 and message or a message error with an error code
   *
   */
  async update(industryId, title, email, specialties = [], userId) {
    let trx;
    try {
      const industry = await Industry.find(industryId);
      if (!industry) {
        return {
          success: false,
          code: 404,
          message: Antl.formatMessage('messages.error.notFound', { entity: 'Industry' }),
        };
      }
      trx = await Database.beginTransaction();

      industry.email = email;
      if (!CustomString(title).isEqualTo(industry.title)) {
        industry.title = title;
        await this.updateContactsIndustry(title, industry.id, trx);
      }

      const resSpecialties = await this.updateOrCreateSpecialties(specialties, industry.id, userId, trx);
      if (!resSpecialties.success) {
        trx && (await trx.rollback());
        return resSpecialties;
      }

      await industry.save(trx);
      await trx.commit();
      await this.refreshViews();

      await industry.load('specialties');
      return {
        success: true,
        message: Antl.formatMessage('messages.success.creation', { entity: 'Industry' }),
        code: 201,
        data: industry,
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      trx && (await trx.rollback());

      return {
        success: false,
        code: 500,
        message: Antl.formatMessage('messages.error.internalServer', { action: 'creating', entity: 'industry' }),
      };
    }
  }

  async updateOrCreateSpecialties(specialties, industryId, userId, trx) {
    for (const specialty of specialties) {
      const { id, title, subspecialties, positions } = specialty;
      const resultSpecialty = id
        ? await SpecialtyRepository.update(id, title, subspecialties, positions, userId, trx)
        : await SpecialtyRepository.create(industryId, title, subspecialties, positions, userId, trx);
      if (!resultSpecialty.success) return resultSpecialty;
    }
    return {
      success: true,
    };
  }

  async refreshViews() {
    await SpecialtyRepository.refreshView();
    await SubspecialtyRepository.refreshView();
    await PositionRepository.refreshView();
  }

  async updateContactsIndustry(title, industryId, trx) {
    await trx.raw(
      `UPDATE contacts_directory SET industry = :industryTitle, industry_specialty = :industryTitle || ': ' || specialty where industry_id = :industryId`,
      {
        industryTitle: title,
        industryId,
      }
    );
  }
}

module.exports = IndustryRepository;
