'use strict';

/** @typedef {import('@adonisjs/framework/src/Request')} Request */
/** @typedef {import('@adonisjs/framework/src/Response')} Response */
/** @typedef {import('@adonisjs/framework/src/View')} View */

// Utils
const appInsights = require('applicationinsights');
const Database = use('Database');
const { JobOrderStatusSchemes, CandidateStatusSchemes, EntityTypes } = use('App/Helpers/Globals');

// Repositories
const JobOrderRepository = new (use('App/Helpers/JobOrderRepository'))();
const CompanyRepository = new (use('App/Helpers/CompanyRepository'))();
const CandidateRepository = new (use('App/Helpers/CandidateRepository'))();
const LocationRepository = new (use('App/Helpers/LocationRepository'))();
const RecruiterRepository = new (use('App/Helpers/RecruiterRepository'))();

// Models
const Address = use('App/Models/Address');

/**
 * Resourceful controller for interacting with inventories
 */
class InventoryController {
  /**
   * Show a list of all inventories.
   * GET inventories
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   * @param {View} ctx.view
   */
  async index({ request, response }) {
    const { entityType } = request.all();
    let results;
    try {
      switch (entityType) {
        case EntityTypes.Company:
          results = await this.searchCompanies(request);
          break;
        case EntityTypes.Candidate:
          results = await this.searchCandidates(request);
          break;
        case EntityTypes.JobOrder:
          results = await this.searchJobOrders(request);
          break;
        default:
          return response.status(400).send({
            message: 'Entity Type not valid',
          });
      }
      return response.ok(results);
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      return response.status(500).send({
        message: 'There was a problem with your search. Please try again',
      });
    }
  }

  async searchCompanies(request) {
    const query = Database.table('companies as cp');
    query
      .select([
        'cp.id',
        'cp.name',
        'spec.industry',
        'cp.coordinates[1] as latitude',
        'cp.coordinates[0] as longitude',
        'rec.user_name as recruiter',
        'rec.initials',
        'rec.user_email as recruiter_email',
        'spec.title as specialty',
        'subspec.title as subspecialty',
        'ctype.title as type',
        'ctype.color as type_class',
        Database.raw(`json_build_object('id', ctype.id, 'title', ctype.title, 'color', ctype.color) as type_detail`),
      ])
      .innerJoin('v_specialties as spec', 'cp.specialty_id', 'spec.id')
      .leftJoin('subspecialties as subspec','cp.subspecialty_id','subspec.id')
      .innerJoin('v_users as rec', 'cp.recruiter_id', 'rec.id')
      .leftJoin('v_cities as cty', 'cp.city_id', 'cty.id')
      .leftJoin('company_types as ctype', 'cp.company_type_id', 'ctype.id');

    this.applyKeywordClause(request, query, 'cp.name');
    await this.applyWhereClause(request, query, 'cp');

    const companies = await query;

    return companies;
  }

  async searchJobOrders(request) {
    let {  keyword, typeId, statusId, positionId } = request.all();

    const query = Database.table('job_orders as jo');
    query
      .select([
        'jo.id',
        'jo.title',
        'itry.title as industry',
        'jo.created_at',
        'jo.updated_at',
        'add.coordinates[1] as latitude',
        'add.coordinates[0] as longitude',
        'pri.full_name as recruiter',
        'usr.initials',
        'usr.email as recruiter_email',
        'spec.title as specialty',
        'subspec.title as subspecialty',
        'jotype.title as type',
        'jotype.style_class_name as type_class',
        'positions.title as functional_title',
        'companies.name as company_name',
        Database.raw(`json_build_object('id', jos.id, 'title', jos.title, 'color', jos.style) as status`),
        Database.raw(`json_build_object('id', jotype.id, 'title', jotype.title, 'color', jotype.style_class_name) as type_detail`)
      ])
      .innerJoin('users as usr','jo.recruiter_id','usr.id')
      .innerJoin('personal_informations as pri', 'usr.personal_information_id', 'pri.id')
      .innerJoin('positions ', 'jo.position_id', 'positions.id')
      .leftJoin('addresses as add', 'jo.address_id', 'add.id')
      .leftJoin('cities as cty', 'add.city_id', 'cty.id')
      .leftJoin('states as st', 'cty.state_id', 'st.id')
      .leftJoin('countries as cte', 'st.country_id', 'cte.id')
      .innerJoin('companies', 'jo.company_id', 'companies.id')
      .leftJoin('specialties as spec','jo.specialty_id','spec.id')
      .leftJoin('subspecialties as subspec','jo.subspecialty_id','subspec.id')
      .leftJoin('industries as itry', 'spec.industry_id', 'itry.id')
      .leftJoin('white_sheets as wht', 'jo.id', 'wht.job_order_id')
      .innerJoin('job_order_statuses as jos', 'jo.status_id', 'jos.id')
      .leftJoin('job_order_types as jotype','wht.job_order_type_id','jotype.id');

    if (keyword) {
      await this.applyFullTextSearch(query, keyword);
    }
      
    await this.applyWhereClause(request, query, 'jo');

    if(typeId){
      query.where('jotype.id',typeId)
    }

    if(statusId){
      query.where('jos.id', statusId)
    }

    if(positionId){
      query.where('positions.id',positionId);
    }

    const jobOrders = await query;

    return jobOrders;
  }

  async searchCandidates(request) {
    let { typeId, statusId, positionId } = request.all();

    const query = Database.table('candidates as ca');
    query
      .select([
        'ca.id',
        'ca.title',
        'pi.full_name',
        'ca.created_at',
        'ca.updated_at',
        'add.coordinates[1] as latitude',
        'add.coordinates[0] as longitude',
        'pri.full_name as recruiter',
        'usr.initials',
        'usr.email as recruiter_email',
        'spec.title as specialty',
        'subspec.title as subspecialty',
        'catype.title as type',
        'catype.style_class_name as type_class',
        'positions.title as functional_title',
        'itry.title as industry',
        Database.raw(`json_build_object('id', cas.id, 'title', cas.title, 'color', cas.style) as status`),
        Database.raw(`json_build_object('id', catype.id, 'title', catype.title, 'color', catype.style_class_name) as type_detail`)
      ])
      .innerJoin('users as usr','ca.recruiter_id','usr.id')
      .innerJoin('personal_informations as pri', 'usr.personal_information_id', 'pri.id')
      .innerJoin('personal_informations as pi', 'ca.personal_information_id', 'pi.id')
      .innerJoin('positions', 'ca.position_id', 'positions.id')
      .leftJoin('addresses as add', 'pi.address_id', 'add.id')
      .leftJoin('cities as cty', 'add.city_id', 'cty.id')
      .leftJoin('states as st', 'cty.state_id', 'st.id')
      .leftJoin('countries as cte', 'st.country_id', 'cte.id')
      .leftJoin('specialties as spec','ca.specialty_id','spec.id')
      .leftJoin('subspecialties as subspec','ca.subspecialty_id','subspec.id')
      .leftJoin('industries as itry', 'spec.industry_id', 'itry.id')
      .leftJoin('blue_sheets as bsh', 'ca.id', 'bsh.candidate_id')
      .innerJoin('candidate_statuses as cas', 'ca.status_id', 'cas.id')
      .leftJoin('candidate_types as catype','bsh.candidate_type_id','catype.id');


    this.applyKeywordClause(request, query, 'pi.full_name');
    await this.applyWhereClause(request, query, 'ca');

    if(typeId){
      query.where('catype.id',typeId)
    }

    if(statusId){
      query.where('cas.id', statusId)
    }

    if(positionId){
      query.where('positions.id',positionId);
    }

    const candidates = await query;

    return candidates;
  }

  /**
   * Return the where clause to apply on the query.
   * GET where clause
   *
   * @param {Request} ctx.request
   */
  applyKeywordClause(request, query, field) {
    const { keyword } = request.all();
    if (keyword) {
      query.where(function () {
        this.where(field, 'ilike', `%${keyword}%`);
      });
    }
  }

  /**
   * Return the where clause to apply on the query.
   * GET where clause
   *
   * @param {Request} ctx.request
   */
  async applyWhereClause(request, query, tableName) {
    const { industryId, stateId, cityId, zip, radius, specialtyId, subspecialtyId, coachId, recruiterId, typeId, entityType, statusId } = request.all();
    const whereClause = {};

    if (industryId) {
      const key = entityType !== EntityTypes.Company ? 'itry.id' : 'spec.industry_id'
      whereClause[key] = industryId;
    }

    if(specialtyId){
      whereClause['spec.id'] = specialtyId;
    }

    if(subspecialtyId){
      whereClause['subspec.id'] = subspecialtyId;
    }

    if (stateId) {
      const key = entityType !== EntityTypes.Company ? 'st.id' : 'cty.state_id'
      whereClause[key] = stateId;
    }

    if (cityId) {
      const key = entityType !== EntityTypes.Company ? 'add.city_id' : 'cp.city_id'
      whereClause[key] = cityId;
    }

    if (zip && radius) {
      const meters = radius * 1609.34;
      if(entityType !== EntityTypes.Company) {
        const address = await Address.findBy('zip', zip);
        if(!address){
          query.where('add.zip', zip);
        } else {
          const { x: longitude  , y: latitude } = address.coordinates;
  
          query.whereRaw(
            'ST_DWithin( ST_MakePoint(add.coordinates[0],add.coordinates[1])::geography, ST_MakePoint(?,?)::geography, ?)',
            [longitude, latitude, meters]
          );
        }
      } else {
        const zipCode = await LocationRepository.findByZip(zip);
        if(zipCode) {
          query.whereRaw(
            'ST_DWithin( ST_MakePoint(cp.coordinates[0], cp.coordinates[1])::geography, ST_MakePoint(?,?)::geography, ?)',
            [zipCode.longitude, zipCode.latitude, meters]
          );
        } else {
          query.where('cp.zip', zip);
        }
      }
    } else if (zip) {
      const key = entityType !== EntityTypes.Company ? 'add.zip' : 'cp.zip'
      whereClause[key] = zip;
    }

    if(coachId){
      const recruitersOnCoachTeam = await RecruiterRepository.recruitersByUser(coachId, 'coach_id');
      recruitersOnCoachTeam.push({recruiter_id:Number(coachId)})
      const whereInClauseRecruiters = recruitersOnCoachTeam.map((recruiter) => recruiter.recruiter_id);
      query.where(function () {
        this.whereIn(`${tableName}.created_by`, whereInClauseRecruiters)
            .orWhereIn(`${tableName}.recruiter_id`,whereInClauseRecruiters);
      });
    }

    if (statusId) {
      if (entityType === EntityTypes.Candidate) {
        whereClause['ca.status_id'] = statusId;
      } else if (entityType === EntityTypes.JobOrder) {
        whereClause['jo.status_id'] = statusId;
      }
    }

    if (typeId) {
      if (entityType === EntityTypes.Candidate) {
        whereClause['bsh.candidate_type_id'] = typeId;
      } else if (entityType === EntityTypes.JobOrder) {
        whereClause['wht.job_order_type_id'] = typeId;
      } else if (entityType === EntityTypes.Company) {
        whereClause['cp.company_type_id'] = typeId;
      }
    }

    if (entityType === EntityTypes.JobOrder && statusId != JobOrderStatusSchemes.Inactive) {
      query.where('jo.status_id', '!=', JobOrderStatusSchemes.Inactive);
    }

    if (entityType === EntityTypes.Candidate && statusId != CandidateStatusSchemes.Inactive) {
      query.where('ca.status_id', '!=', CandidateStatusSchemes.Inactive);
    }

    if(recruiterId){
      query.where(function() {
        this.where(`${tableName}.created_by`,recruiterId)
          .orWhere(`${tableName}.recruiter_id`,recruiterId);
      });
    }

    query.where(whereClause);
  }

  async applyFullTextSearch(query, keyword) {
    const fullTextQuery = await this.generateFullTextQuery(keyword);
    query.whereRaw('to_tsvector(jo.title) @@ to_tsquery(?)', [fullTextQuery]);
    query.orderByRaw('ts_rank(to_tsvector(jo.title), to_tsquery(?))', [fullTextQuery]);
  }

  async generateFullTextQuery(keyword) {
    const terms = keyword.trim().split(' ');
    const suggestedWordsSets = [];
    let suggestedWordsCount = 0;
    for (const term of terms) {
      const suggestedWords = await this.getSuggestedWords(term);
      if (suggestedWords.length > 0) {
        suggestedWordsCount += suggestedWords.length;
        suggestedWordsSets.push(suggestedWords);
      }
    }

    if (suggestedWordsCount === 0)
      return '';

    const subQuerySet = [];

    for (const wordSet of suggestedWordsSets) {
      subQuerySet.push(`(${wordSet.join(' | ')})`)
    }
    return `(${subQuerySet.join(' & ')})`;
  }

  async getSuggestedWords(term) {
    const wordsRows = await Database.table('job_orders_job_titles_words_indices')
    .select(['word'])
    .whereRaw('word <% ?', [term]);

    return wordsRows.map(word => word.word);
  }

  async getLastActivity({request, response}) {
    const {entityId, entityType} = request.all();
    switch(entityType) {
      case EntityTypes.JobOrder:
          return await  JobOrderRepository.getLastActivity(entityId);
      case EntityTypes.Company:
        return await  CompanyRepository.getLastActivity(entityId);
      case EntityTypes.Candidate:
          return await  CandidateRepository.getLastActivity(entityId);
      default: return response.status(400).send({
        message: 'EntityType not Valid',
      });
    }
  }
}

module.exports = InventoryController;
