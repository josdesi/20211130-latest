'use strict';

//Utils
const Database = use('Database');
const appInsights = require('applicationinsights');
const { EntityTypes, nameTypes } = use('App/Helpers/Globals');

//Repositories

/** @typedef {import('@adonisjs/framework/src/Request')} Request */
/** @typedef {import('@adonisjs/framework/src/Response')} Response */
/** @typedef {import('@adonisjs/framework/src/View')} View */

/**
 * Resourceful controller for interacting with searches
 */
class SearchController {
  splitStringToArray(string) {
    if (!Array.isArray(string) && string.toString().length > 0) return string.split(',');

    return [];
  }

  /**
   * Show a list of all searches.
   * GET searches
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async index({ request, response, auth }) {
    const userId = auth.current.user.id;
    const { entityType, keyword, limit, isForConvertion = false, hideNonEmployees = false } = request.all();
    let results;
    let { inColumns = [], excludeIds = [] } = request.all();

    inColumns = this.splitStringToArray(inColumns);
    excludeIds = this.splitStringToArray(excludeIds);

    try {
      switch (entityType) {
        case EntityTypes.Company:
          results = await this.searchCompanies(keyword, limit, inColumns);
          break;
        case EntityTypes.Candidate:
          results = await this.searchCandidates(keyword, limit, inColumns, excludeIds, hideNonEmployees);
          break;
        case EntityTypes.JobOrder:
          results = await this.searchJobOrders(keyword, limit, inColumns);
          break;
        case EntityTypes.HiringAuthority:
          results = await this.searchHiringAuthorities(keyword, limit, inColumns);
          break;
        case EntityTypes.Contact:
          results = await this.searchContacts(keyword, limit, Boolean(isForConvertion), userId);
          break;
        case EntityTypes.Name:
          results = await this.searchNames(keyword, limit, Boolean(isForConvertion), userId);
          break;
        case EntityTypes.HiringAuthorityOrName:
          results = await this.searchHiringAuthorityOrNames(keyword, limit);
          break;
        default:
          return response.status(400).send({
            message: 'The type is not valid',
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

  buildCompaniesQuery() {
    return Database.table('companies as cp')
      .select([
        'cp.id',
        'cp.name',
        'spec.industry',
        'rec.user_name as recruiter',
        'rec.initials',
        'rec.coach_name',
        'city.state',
        'city.title as city',
      ])
      .innerJoin('v_specialties as spec', 'cp.specialty_id', 'spec.id')
      .innerJoin('v_users as rec', 'cp.recruiter_id', 'rec.id')
      .leftJoin('v_cities as city', 'cp.city_id', 'city.id')
  }

  async searchCompanies(keyword, limit, inColumns) {

    const companies = await this.buildCompaniesQuery()
      .where('cp.searchable_text', 'ilike', `%${keyword}%`)
      .limit(limit);
    
    const results = companies.map((company) => {
      return {
        id: company.id,
        name: company.name,
        subtitle: `${company.industry} / ${company.city}, ${company.state}`,
        recruiter: company.recruiter,
        initials: company.initials,
        type: EntityTypes.Company,
      };
    });

    return results;
  }

  async searchCompanysByTheLeft(keyword, limit, inColumns) {
    const query = this.buildCompaniesQuery()
    .where('cp.name', 'ilike', `${keyword}%`);

    this.applyLeftSearchColumns(query, inColumns, keyword);
    query.orderBy('cp.name');

    if (limit) {
      query.limit(limit);
    }
    return await query;
  }

  async searchCompaniesAnyWhere(keyword, limit, inColumns, idsToExclude) {
    const query = this.buildCompaniesQuery()
    .where('cp.name', 'ilike', `%${keyword}%`);
    query.whereNotIn('cp.id', idsToExclude);
    this.applySearchColumns(query, inColumns, keyword);
    query.orderBy('cp.name');

    if (limit) {
      query.limit(limit);
    }
    return await query;
  }

  async searchJobOrders(keyword, limit, inColumns) {
    const query = Database.table('job_orders as jo');
    query
      .select([
        'jo.id',
        'jo.title',
        'cp.name  as company_title',
        'pri.full_name as recruiter_full_name',
        'rec.initials',
        'pos.title as functional_title',
        'st.title as state',
        'cty.title as city',
      ])
      .innerJoin('companies as cp', 'jo.company_id', 'cp.id')
      .innerJoin('users as rec', 'cp.recruiter_id', 'rec.id')
      .innerJoin('personal_informations as pri', 'rec.personal_information_id', 'pri.id')
      .innerJoin('positions as pos', 'pos.id', 'jo.position_id')
      .innerJoin('addresses as addr', 'addr.id', 'jo.address_id')
      .innerJoin('cities as cty', 'cty.id', 'addr.city_id')
      .innerJoin('states as st', 'st.id', 'cty.state_id')
      .where('jo.title', 'ilike', `%${keyword}%`)
      .orWhere('pos.title', 'ilike', `%${keyword}%`)
      .orWhere('cp.name', 'ilike', `%${keyword}%`);

    //await this.applyFullTextSearchForJoborder(query, keyword);
    if (limit) {
      query.limit(limit);
    }
    const jobOrders = await query;
    const results = jobOrders.map((jobOrder) => {
      return {
        id: jobOrder.id,
        title: `${jobOrder.functional_title} / ${jobOrder.title}`,
        subtitle: jobOrder.company_title,
        recruiter: jobOrder.recruiter_full_name,
        initials: jobOrder.initials,
        city: jobOrder.city,
        state: jobOrder.state,
        type: EntityTypes.JobOrder,
      };
    });
    return results;
  }

  async searchCandidates(keyword, limit, inColumns, excludeIds, hideNonEmployees) {
    const employerCompany = Database.table('company_has_candidate_employees')
      .select('candidate_id', 'company_id')
      .distinct()
      .where('is_current_company', true)
      .as('employee');
      
    const query = Database.table('candidates as can');
    query
      .select([
        'can.id',
        'can.title',
        'can.email',
        'pst.title as functional_title',
        'pi.full_name',
        'pri.full_name as recruiter_full_name',
        'rec.initials',
        Database.raw("coalesce(companies.name, can.current_company, '') as current_company"),
        'st.title as state',
        'cty.title as city',
      ])
      .leftJoin(employerCompany, 'can.id', 'employee.candidate_id')
      .leftJoin('companies', 'employee.company_id', 'companies.id')
      .innerJoin('personal_informations as pi', 'can.personal_information_id', 'pi.id')
      .innerJoin('users as rec', 'can.recruiter_id', 'rec.id')
      .innerJoin('personal_informations as pri', 'rec.personal_information_id', 'pri.id')
      .innerJoin('addresses as addr', 'addr.id', 'pi.address_id')
      .innerJoin('cities as cty', 'cty.id', 'addr.city_id')
      .innerJoin('states as st', 'st.id', 'cty.state_id')
      .leftJoin('positions as pst', 'can.position_id', 'pst.id')
      .whereNotIn('can.id', excludeIds)
      .where('pi.full_name', 'ilike', `%${keyword}%`);

    if(hideNonEmployees === true || hideNonEmployees === 'true'){
      query.whereNotNull('companies.id');
      this.strictApplySearchColumns(query, inColumns, keyword);
    }else{
      this.applySearchColumns(query, inColumns, keyword);
    }

    query.orderBy('pi.full_name');
    if (limit) {
      query.limit(limit);
    }

    const candidates = await query;

    const results = candidates.map((candidate) => {
      return {
        id: candidate.id,
        title: candidate.full_name,
        email: candidate.email,
        subtitle: `${candidate.title} / ${candidate.functional_title}`,
        recruiter: candidate.recruiter_full_name,
        initials: candidate.initials,
        city: candidate.city,
        state: candidate.state,
        current_company: candidate.current_company,
        type: EntityTypes.Candidate,
      };
    });
    return results;
  }

  applySearchColumns(query, inColumns, keyword) {
    inColumns.forEach((column) => {
      query.orWhere(column, 'ilike', `%${keyword}%`);
    });
  }

  strictApplySearchColumns(query, inColumns, keyword) {
    query.where((builder) => {
      inColumns.forEach((column) => {
        builder.orWhere(column, 'ilike', `%${keyword}%`);
      });
    });
  }

  applyLeftSearchColumns(query, inColumns, keyword) {
    inColumns.forEach((column) => {
      query.orWhere(column, 'ilike', `${keyword}%`);
    });
  }

  async applyFullTextSearchForJoborder(query, keyword) {
    const fullTextQuery = await this.generateFullTextQuery(keyword);
    query.orWhereRaw('cp.name <% ?', [keyword]);
    query.orWhereRaw('cp.name ilike ?', [`%${keyword}%`]);
    query.orWhereRaw('to_tsvector(pos.title) @@ to_tsquery(?)', [fullTextQuery]);
    query.orWhereRaw('to_tsvector(jo.title) @@ to_tsquery(?)', [fullTextQuery]);
    query.orderByRaw('cp.name <<-> ?', [keyword]);
    query.orderByRaw('ts_rank(to_tsvector(pos.title), to_tsquery(?)) desc', [fullTextQuery]);
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

    if (suggestedWordsCount === 0) return '';

    const subQuerySet = [];

    for (const wordSet of suggestedWordsSets) {
      subQuerySet.push(`(${wordSet.join(' | ')})`);
    }
    return `(${subQuerySet.join(' & ')})`;
  }

  async getSuggestedWords(term) {
    const wordsRows = await Database.table('job_orders_job_titles_words_indices')
      .select(['word'])
      .whereRaw('word <% ?', [term]);

    return wordsRows.map((word) => word.word);
  }

  async searchHiringAuthorities(keyword = '', limit, inColumns) {
    const query = Database.table('hiring_authorities as ha')
      .select([
        'ha.id',
        'ha.full_name',
        'ha.title',
        'ha.work_email',
        'ha.personal_email',
        'ha.specialty_id',
        'spec.title as specialty_title',
        'ha.subspecialty_id',
        'subspec.title as subspecialty_title',
        'spec.industry_id',
        'spec.industry as industry_title',
        'ha.position_id',
        'pst.title as position_title',
        'ha.first_name',
        'ha.last_name',
        'ha.work_phone',
        'ha.ext',
        'ha.personal_phone',
        'ha.other_ext',
        'cp.name as company_name',
      ])
      .leftJoin('companies as cp', 'cp.id', 'ha.company_id')
      .leftJoin('v_specialties as spec', 'ha.specialty_id', 'spec.id')
      .leftJoin('subspecialties as subspec', 'ha.subspecialty_id', 'subspec.id')
      .leftJoin('positions as pst', 'pst.id', 'ha.position_id')
      .orWhereRaw('lower(full_name) like ?', [`${keyword.toLowerCase()}%`])
      .orWhereRaw('lower(work_email) like ?', [`${keyword.toLowerCase()}%`])
      .orderByRaw('lower(full_name) asc');;

    if (limit) {
      query.limit(limit);
    }
    const hiringAuthorities = await query;
    const results = hiringAuthorities.map(
      ({
        id,
        full_name,
        title,
        company_name,
        specialty_id,
        specialty_title,
        subspecialty_id,
        subspecialty_title,
        position_id,
        position_title,
        work_email,
        personal_email,
        first_name,
        last_name,
        work_phone,
        industry_id,
        industry_title,
        personal_phone,
        other_ext,
      }) => {
        return {
          id: id,
          full_name,
          subtitle: `${title} / ${company_name || ''}`,
          title,
          recruiter: null,
          initials: null,
          type: EntityTypes.HiringAuthority,
          industry_id,
          position_id,
          position: position_id ? { id: position_id, title: position_title } : null,
          specialty_id,
          specialty: specialty_id
            ? { id: specialty_id, title: specialty_title, industry: { id: industry_id, title: industry_title } }
            : null,
          subspecialty_id,
          subspecialty: subspecialty_id ? { id: subspecialty_id, title: subspecialty_title } : null,
          work_email,
          personal_email,
          first_name,
          last_name,
          work_phone,
          personal_phone,
          other_ext,
        };
      }
    );
    return results;
  }

  async searchNames(keyword, limit, isForConvertion) {
    const query = Database.table('names as nm')
      .select([
        'nm.id',
        'pi.full_name',
        'nm.title',
        'nm.email',
        'pi_rec.full_name as recruiter_full_name',
        'rec.initials as recruiter_initials',
        'sp.title as specialty_title',
        'ind.title as industry_title',
      ])
      .innerJoin('personal_informations as pi', 'pi.id', 'nm.personal_information_id')
      .innerJoin('specialties as sp', 'sp.id', 'nm.specialty_id')
      .innerJoin('industries as ind', 'ind.id', 'sp.industry_id')
      .innerJoin('users as rec', 'rec.id', 'nm.created_by')
      .innerJoin('personal_informations as pi_rec', 'pi_rec.id', 'rec.personal_information_id')
      .where('searchable_text', 'ilike', `%${keyword}%`)
    if(isForConvertion){
      await this.applyRulesForConvertion(query);
    }
    if (limit) {
      query.limit(limit);
    }
    const names = await query;
    const results = names.map((name) => {
      return {
        id: name.id,
        title: name.full_name,
        subtitle: `${name.specialty_title} / ${name.industry_title}`,
        recruiter: name.recruiter_full_name,
        initials: name.recruiter_initials,
        type: EntityTypes.Name,
        email: name.email
      };
    });
    return results;
  }

  async searchContacts(keyword, limit) {
    const query = Database.table('contacts_directory as con')
      .select([
        'con.id',
        'con.full_name',
        'con.title',
        'con.current_company',
        'specialty as specialty_title',
        'con.email',
        'industry as industry_title',
      ])
      .where('con.role_id', '!=', nameTypes.Candidate)
      .where('con.searchable_text', 'ilike', `%${keyword}%`);
    if (limit) {
      query.limit(limit);
    }
    const names = await query;
    const results = names.map((contact) => {
      return {
        id: contact.id,
        email: contact.email,
        title: contact.full_name,
        subtitle: `${contact.specialty_title} / ${contact.industry_title} / ${contact.current_company}`,
        recruiter: null,
        initials: null,
        type: EntityTypes.Name,
      };
    });
    return results;
  }
  async applyRulesForConvertion(query){
    query.whereRaw('convertion_date is null');
  }

  async searchHiringAuthorityOrNames(keyword, limit) {    
    const query = Database.from('contacts_directory')
        .select([
          'origin_table_id as id',
          'email',
          Database.raw(`
            CASE
              WHEN role_id = ${nameTypes.Name} THEN 'contact'
              WHEN role_id = ${nameTypes.HiringAuthority} THEN 'inventory'
              ELSE NULL
            END AS type
          `),
          'specialty_id',
          'title',
          'full_name',
          Database.raw(`COALESCE(company, current_company) as company`)
        ])
        .whereIn('role_id', [nameTypes.Name, nameTypes.HiringAuthority])
        .where('searchable_text', 'ilike', `%${keyword}%`)
        .orderBy('full_name', 'asc')
        .limit(limit);
    const queryResults = await query;
    const results = queryResults.map(queryResult => {
      return  {
        ...queryResult,
        subtitle: queryResult.company &&  queryResult.title ? `${queryResult.company} / ${queryResult.title}` : queryResult.title,
      }
    });
    return results;
  }
}

module.exports = SearchController;
