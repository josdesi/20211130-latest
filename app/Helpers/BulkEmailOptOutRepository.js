'use strict';

//Models
const EmailOptOut = use('App/Models/EmailOptOut');
const EmailHistory = use('App/Models/EmailHistory');
const EmailOptOutType = use('App/Models/EmailOptOutType');
const UnsubscribeReason = use('App/Models/UnsubscribeReason');
const EmailUserUnsubscribe = use('App/Models/EmailUserUnsubscribe');
const Name = use('App/Models/Name');
const Candidate = use('App/Models/Candidate');
const HiringAuthority = use('App/Models/HiringAuthority');
const OptOutChangeLog = use('App/Models/OptOutChangeLog');

//Repositories
const CandidateRepository = new (use('App/Helpers/CandidateRepository'))();
const HiringAuthorityRepository = new (use('App/Helpers/HiringAuthorityRepository'))();
const NameRepository = new (use('App/Helpers/NameRepository'))();
const ModulePresetsConfigRepository = new (use('App/Helpers/ModulePresetsConfigRepository'))();

//Utils
const appInsights = require('applicationinsights');
const Database = use('Database');
const {
  EmailOptOutTypes,
  UnsubscribeReasonTypes,
  companyType,
  CandidateStatusSchemes,
  SendgridEventTypes,
  OperationType,
  EntityTypes,
  UnsubscribeReasons,
  joinStringForQueryUsage,
  nameTypes,
} = use('App/Helpers/Globals');
const Event = use('Event');
const EventTypes = use('App/Helpers/Events');

class BulkEmailOptOutRepository {
  /**
   * Obtain all the opt out emails
   *
   * @param {Number} type
   *
   * @return {Object} Emails found
   *
   */
  async getOptOutEmails() {
    try {
      const candidatesQuery = Database.table('email_opt_outs as optout')
        .select([
          'optout.id',
          Database.raw(':type as type', { type: SendgridEventTypes.optout }),
          'item.email',
          'item.id as item_id',
        ])
        .innerJoin('candidates as item', 'optout.item_id', 'item.id')
        .where('optout.email_opt_out_type_id', EmailOptOutTypes.Candidate);

      const haQuery = Database.table('email_opt_outs as optout')
        .select([
          'optout.id',
          Database.raw(':type as type', { type: SendgridEventTypes.optout }),
          'item.work_email as email',
          'item.id as item_id',
        ])
        .innerJoin('hiring_authorities as item', 'optout.item_id', 'item.id')
        .where('optout.email_opt_out_type_id', EmailOptOutTypes.HiringAuthority);

      const nameQuery = Database.table('email_opt_outs as optout')
        .select([
          'optout.id',
          Database.raw(':type as type', { type: SendgridEventTypes.optout }),
          'item.email',
          'item.id as item_id',
        ])
        .innerJoin('names as item', 'optout.item_id', 'item.id')
        .where('optout.email_opt_out_type_id', EmailOptOutTypes.Names);

      const unsubscribesQuery = Database.table('email_user_unsubscribes as item').select([
        'item.id',
        Database.raw(':type as type', { type: SendgridEventTypes.unsubscribe }),
        'item.email',
        Database.raw('NULL as item_id'),
      ]);

      const query = Database.select(['item.id', 'item.email', 'item.item_id', 'item.type']).from(
        Database.union(candidatesQuery).union(haQuery).union(nameQuery).union(unsubscribesQuery).as('item')
      );

      const result = await query;

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
        message: 'There was a problem when retrieving the emails opt outs',
      };
    }
  }

  async getOptOutEmailsByIdsAndEmails(itemIds, emails) {
    const { candidateIds = [], haIds = [], nameIds = [] } = itemIds;
    try {
      const candidatesQuery = Database.table('email_opt_outs as optout')
        .select([
          'optout.id',
          Database.raw(':type as type', { type: SendgridEventTypes.optout }),
          'item.email',
          'item.id as item_id',
        ])
        .innerJoin('candidates as item', 'optout.item_id', 'item.id')
        .whereIn('item_id', candidateIds)
        .where('optout.email_opt_out_type_id', EmailOptOutTypes.Candidate);

      const haQuery = Database.table('email_opt_outs as optout')
        .select([
          'optout.id',
          Database.raw(':type as type', { type: SendgridEventTypes.optout }),
          'item.work_email as email',
          'item.id as item_id',
        ])
        .whereIn('item_id', haIds)
        .innerJoin('hiring_authorities as item', 'optout.item_id', 'item.id')
        .where('optout.email_opt_out_type_id', EmailOptOutTypes.HiringAuthority);

      const nameQuery = Database.table('email_opt_outs as optout')
        .select([
          'optout.id',
          Database.raw(':type as type', { type: SendgridEventTypes.optout }),
          'item.email',
          'item.id as item_id',
        ])
        .whereIn('item_id', nameIds)
        .innerJoin('names as item', 'optout.item_id', 'item.id')
        .where('optout.email_opt_out_type_id', EmailOptOutTypes.Names);

      const unsubscribesQuery = Database.table('email_user_unsubscribes as item')
        .select([
          'item.id',
          Database.raw(':type as type', { type: SendgridEventTypes.unsubscribe }),
          'item.email',
          Database.raw('NULL as item_id'),
        ])
        .whereIn(Database.raw('LOWER(email)'), emails);
      // .whereRaw(`LOWER(email) IN ${joinStringForQueryUsage(emails, true)}`);

      const query = Database.select([
        'item.id',
        Database.raw('LOWER(item.email) as email'),
        'item.item_id',
        'item.type',
      ]).from(Database.union(candidatesQuery).union(haQuery).union(nameQuery).union(unsubscribesQuery).as('item'));

      const result = await query;

      return {
        success: true,
        code: 200,
        data: result,
      };
    } catch (error) {
      const properties = {
        error,
        payload: {
          itemIds,
          emails,
        },
      };
      appInsights.defaultClient.trackEvent({ name: 'Get Opt Out By Ids Failed', properties });
      appInsights.defaultClient.trackException({ exception: error });

      return {
        success: false,
        code: 500,
        message: 'There was a problem when retrieving the emails opt outs',
      };
    }
  }

  /**
   * Returns an array of candidates & names from those that belong to our client's companies
   *
   * @summary The candidates & names returned are those that belong to a company that is client or vendor, expected to be used in BulkEmail, getBlockedEmails
   *
   * @return {Object[]} Clients
   */
  async getCompanyClientEmployeesEmails() {
    const clientCompaniesSubquery = Database.table('companies')
      .select('id')
      .whereIn('company_type_id', [companyType.Vendor, companyType.Client]);

    const clientNamesRaw = await Name.query()
      .whereIn('company_id', clientCompaniesSubquery)
      .whereNotNull('email')
      .orWhereHas('employerCompanies', (builder) => {
        builder.where('is_current_company', true).whereIn('company_id', clientCompaniesSubquery);
      })
      .fetch();
    const clientNames = clientNamesRaw ? clientNamesRaw.toJSON() : [];

    const candidateEmployeesRaw = await Candidate.query()
      .whereHas('employerCompanies', (builder) => {
        builder.where('is_current_company', true).whereIn('company_id', clientCompaniesSubquery);
      })
      .fetch();
    const candidateEmployees = candidateEmployeesRaw ? candidateEmployeesRaw.toJSON() : [];

    return clientNames.concat(candidateEmployees);
  }

  /**
   * Returns an array of candidates that have placed/inactive status
   *
   * @summary This searches those candidates that are either placed or inactive, then are returned for their blockage
   *
   * @param {Number[]} candidateIds - The candidates being searched that could be inactive/placed
   *
   * @return {Object[]} Placed or inactive candidates that match the passed ids
   */
  async getPlacedOrInactiveCandidates(candidateIds) {
    const candidates = await Candidate.query()
      .whereIn('id', candidateIds)
      .whereIn('status_id', [CandidateStatusSchemes.Placed, CandidateStatusSchemes.Inactive])
      .fetch();

    return candidates.toJSON();
  }

  /**
   * Returns an array of hiring authorities from the company of the candidates passed
   *
   * @summary The hiring authorities returned are those that belong to a company that belong to the candidates passed, used to filterout those hirings emails
   *
   * @param candidateIds - The candidates whom their companies hiring authorities will be returned from
   *
   * @return {Object[]} Hiring authorities
   */
  async getCompanyClientHiringAuthoritiesEmails(candidateIds) {
    const companiesSubquery = Database.table('company_has_candidate_employees')
      .select('company_id')
      .whereIn('candidate_id', candidateIds)
      .andWhere('is_current_company', true);

    const primaryHiringAuthoritiesSubquery = Database.table('hiring_authorities')
      .select('id')
      .whereIn('company_id', companiesSubquery);
    const secondaryHiringAuthoritiesSubquery = Database.table('hiring_authority_has_companies')
      .select('hiring_authority_id')
      .whereIn('company_id', companiesSubquery);

    const hiringAuthorities = (
      await HiringAuthority.query()
        .select(['*', Database.raw('LOWER(work_email) as email')])
        .whereIn('id', primaryHiringAuthoritiesSubquery)
        .orWhereIn('id', secondaryHiringAuthoritiesSubquery)
        .fetch()
    ).toJSON();

    return hiringAuthorities;
  }

  /**
   * Returns an array of hiring authorities from the client & signed companies
   *
   * @summary Bulk Email has an option to allow filter out hiring authorities that are in a company that is client or signed
   *
   * @return {Object[]} Hiring authorities
   */
  async getClientSignedHiringAuthorities() {
    const companiesSubquery = Database.table('companies')
      .select('id')
      .whereIn('company_type_id', [companyType.Vendor, companyType.Client]);

    const primaryHiringAuthoritiesSubquery = Database.table('hiring_authorities')
      .select('id')
      .whereIn('company_id', companiesSubquery);
    const secondaryHiringAuthoritiesSubquery = Database.table('hiring_authority_has_companies')
      .select('hiring_authority_id')
      .whereIn('company_id', companiesSubquery);

    const hiringAuthorities = (
      await HiringAuthority.query()
        .select(['*', Database.raw('LOWER(work_email) as email')])
        .whereIn('id', primaryHiringAuthoritiesSubquery)
        .orWhereIn('id', secondaryHiringAuthoritiesSubquery)
        .fetch()
    ).toJSON();

    return hiringAuthorities;
  }

  /**
   * Returns the companies trigram name search
   *
   * @description Since many searches will be used using the same query, a modularization was required, instead obtaining the core that the trigram search will be using always
   *
   * @param {Number} keyword - The company name is being searched
   *
   * @return {Object} The query object
   */
  async getSimilarCompanyClientHAEmails(candidateIds) {
    const companiesSubquery = Database.table('company_has_candidate_employees')
      .select('company_id')
      .whereIn('candidate_id', candidateIds)
      .andWhere('is_current_company', true);

    const originalCompanies = Database.table('companies').select('*').whereIn('id', companiesSubquery).as('n1');
    const comparingCompanies = Database.table('companies').select('*').whereNotIn('id', companiesSubquery).as('n2');

    const similarityThresholdConfig = await ModulePresetsConfigRepository.getById('similarityThreshold');
    const similarityThreshold = Number(similarityThresholdConfig.data.value);
    await Database.raw(`SET pg_trgm.similarity_threshold = ${similarityThreshold}`); //Knex bindvar could work with this query

    const similarNameCompaniesSubquery = Database.select(['n2.id as similar_company_id'])
      .from(originalCompanies)
      .join(comparingCompanies, function () {
        this.on('n1.name', '<>', 'n2.name');
        this.andOn(Database.raw('n1.name % n2.name'));
      });

    const exactNameCompaniesSubquery = Database.select(['n2.id as similar_company_id'])
      .from(originalCompanies)
      .join(comparingCompanies, function () {
        this.on(Database.raw('LOWER(n1.name)'), '=', Database.raw('LOWER(n2.name)'));
      });

    const primaryHiringAuthoritiesSubquery = Database.table('hiring_authorities')
      .select('id')
      .where((builder) => {
        builder.whereIn('company_id', similarNameCompaniesSubquery).orWhereIn('company_id', exactNameCompaniesSubquery);
      });
    const secondaryHiringAuthoritiesSubquery = Database.table('hiring_authority_has_companies')
      .select('hiring_authority_id')
      .where((builder) => {
        builder.whereIn('company_id', similarNameCompaniesSubquery).orWhereIn('company_id', exactNameCompaniesSubquery);
      });

    const hiringAuthorities = (
      await HiringAuthority.query()
        .select(['*', Database.raw('LOWER(work_email) as email')])
        .whereIn('id', primaryHiringAuthoritiesSubquery)
        .orWhereIn('id', secondaryHiringAuthoritiesSubquery)
        .fetch()
    ).toJSON();

    return hiringAuthorities;
  }

  /**
   * Obtain all the recruiters' opt out emails reasons
   *
   * @param {Number} type
   *
   * @return {Object} Opt out reasons
   *
   */
  async getRecruitersReasons(allReasons = false) {
    try {
      const otherReasonIds = UnsubscribeReasons.filter((row) => row.description === 'Other').map((row) => row.id);

      const unsubscribeReasons = await UnsubscribeReason.query()
        .whereHas('type', (builder) => {
          if (!allReasons) builder.where('unsubscribe_reason_type_id', UnsubscribeReasonTypes.Recruiter.id);
        })
        .where((builder) => {
          if (allReasons) builder.whereNotIn('id', otherReasonIds);
        })
        .orderBy('id')
        .fetch();

      const result = unsubscribeReasons.toJSON();

      for (const reason of result) {
        reason.title = reason.description;
      }

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
        message: 'There was a problem while retrieving the opt out reasons',
      };
    }
  }

  /**
   * Obtain all the recruiters that have at least one opt out active
   *
   * @summary This endpoints aims to show which users have an opt out, as well their basic information
   *
   * @return {Array} Users with their information
   *
   */
  async getOptOutRecruiters() {
    try {
      const recruiters = await EmailOptOut.query()
        .select('users.id', 'users.email', 'pi.full_name')
        .distinct('users.id')
        .innerJoin('users', 'email_opt_outs.created_by', 'users.id')
        .innerJoin('personal_informations as pi', 'users.personal_information_id', 'pi.id')
        .orderBy('pi.full_name')
        .fetch();

      const result = recruiters.toJSON();

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
        message: 'There was a problem while retrieving the opt out recruiters',
      };
    }
  }

  /**
   * Show a list of bulk email opt outs
   *
   * @param {Object} { keyword, page, perPage, orderBy, direction, createdBy }
   *
   * @return {Object} Bulk email opt out list with a succes message or an error code
   *
   */
  async listing({ keyword, page, perPage, orderBy, direction, createdBy, isUnsubscribe, reasonId }) {
    try {
      const candidateEmployerCompany = Database.table('company_has_candidate_employees')
        .select('candidate_id', 'company_id')
        .distinct()
        .where('is_current_company', true)
        .as('employee');
      const queryCandidates = Database.table('email_opt_outs as optout')
        .select([
          'optout.id',
          'optout.created_at',
          'reason.description',
          'reason.id as reason_id',
          'optout.custom_reason',
          'pi.full_name as created_by_name',
          'optout.created_by',
          'optout.item_id',
          'optout.email_opt_out_type_id',
          'item.email',
          'itempi.full_name as item_full_name',
          Database.raw('false as is_unsubscribe'),
          'types.title',
          'companies.name as company_name',
          'optout.notes',
        ])
        .leftJoin('unsubscribe_reasons as reason', 'optout.unsubscribe_reason_id', 'reason.id')
        .leftJoin('email_opt_out_types as types', 'optout.email_opt_out_type_id', 'types.id')
        .innerJoin('candidates as item', 'optout.item_id', 'item.id')
        .innerJoin('personal_informations as itempi', 'item.personal_information_id', 'itempi.id')
        .innerJoin('users', 'users.id', 'optout.created_by')
        .innerJoin('personal_informations as pi', 'users.personal_information_id', 'pi.id')
        .leftJoin(candidateEmployerCompany, 'item.id', 'employee.candidate_id')
        .leftJoin('companies', 'employee.company_id', 'companies.id')
        .where('optout.email_opt_out_type_id', EmailOptOutTypes.Candidate);

      const queryHiringAuthorities = Database.table('email_opt_outs as optout')
        .select([
          'optout.id',
          'optout.created_at',
          'reason.description',
          'reason.id as reason_id',
          'optout.custom_reason',
          'pi.full_name as created_by_name',
          'optout.created_by',
          'optout.item_id',
          'optout.email_opt_out_type_id',
          'item.work_email as email',
          'item.full_name as item_full_name',
          Database.raw('false as is_unsubscribe'),
          'types.title',
          'companies.name as company_name',
          'optout.notes',
        ])
        .leftJoin('unsubscribe_reasons as reason', 'optout.unsubscribe_reason_id', 'reason.id')
        .leftJoin('email_opt_out_types as types', 'optout.email_opt_out_type_id', 'types.id')
        .innerJoin('hiring_authorities as item', 'optout.item_id', 'item.id')
        .innerJoin('users', 'users.id', 'optout.created_by')
        .innerJoin('personal_informations as pi', 'users.personal_information_id', 'pi.id')
        .leftJoin('companies', 'item.company_id', 'companies.id')
        .where('optout.email_opt_out_type_id', EmailOptOutTypes.HiringAuthority);

      const nameEmployerCompany = Database.table('company_has_name_employees')
        .select('name_id', 'company_id')
        .distinct()
        .where('is_current_company', true)
        .as('employee');
      const queryNames = Database.table('email_opt_outs as optout')
        .select([
          'optout.id',
          'optout.created_at',
          'reason.description',
          'reason.id as reason_id',
          'optout.custom_reason',
          'pi.full_name as created_by_name',
          'optout.created_by',
          'optout.item_id',
          'optout.email_opt_out_type_id',
          'item.email',
          'itempi.full_name as item_full_name',
          Database.raw('false as is_unsubscribe'),
          'types.title',
          'companies.name as company_name',
          'optout.notes',
        ])
        .leftJoin('unsubscribe_reasons as reason', 'optout.unsubscribe_reason_id', 'reason.id')
        .leftJoin('email_opt_out_types as types', 'optout.email_opt_out_type_id', 'types.id')
        .innerJoin('names as item', 'optout.item_id', 'item.id')
        .innerJoin('personal_informations as itempi', 'item.personal_information_id', 'itempi.id')
        .innerJoin('users', 'users.id', 'optout.created_by')
        .innerJoin('personal_informations as pi', 'users.personal_information_id', 'pi.id')
        .leftJoin(nameEmployerCompany, 'item.id', 'employee.name_id')
        .leftJoin('companies', 'employee.company_id', 'companies.id')
        .where('optout.email_opt_out_type_id', EmailOptOutTypes.Names);

      const queryUnsubscribes = Database.table('email_user_unsubscribes as unsub')
        .select([
          'unsub.id',
          'unsub.created_at',
          'reason.description',
          'reason.id as reason_id',
          'unsub.custom_reason',
          Database.raw("COALESCE(pi.full_name, 'System') as created_by_name"),
          'unsub.created_by',
          Database.raw('NULL as item_id'),
          Database.raw(':id as email_opt_out_type_id', { id: EmailOptOutTypes.User }),
          'unsub.email',
          Database.raw('NULL as item_full_name'),
          Database.raw('true as is_unsubscribe'),
          'types.title',
          Database.raw('NULL as company_name'),
          'unsub.notes',
        ])
        .leftJoin('users', 'users.id', 'unsub.created_by')
        .leftJoin('personal_informations as pi', 'users.personal_information_id', 'pi.id')
        .leftJoin('unsubscribe_reasons as reason', 'unsub.unsubscribe_reason_id', 'reason.id')
        .leftJoin('email_opt_out_types as types', EmailOptOutTypes.User, 'types.id');

      const query = Database.select([
        'item.id',
        Database.raw("COALESCE(item.description, '') as chosen_reason"),
        Database.raw("COALESCE(item.custom_reason, '') as custom_reason"),
        Database.raw(
          "COALESCE((CASE\
        WHEN custom_reason IS NULL OR custom_reason = '' THEN\
          description\
        ELSE\
          CONCAT(description,': ',custom_reason)\
        END), '') as reason_for_the_user"
        ),
        'item.reason_id',
        'item.created_at',
        'item.created_by',
        'item.item_id',
        'item.email_opt_out_type_id',
        'item.email',
        'item.created_by_name',
        'item.item_full_name',
        'item.is_unsubscribe',
        'item.title',
        'item.company_name',
        'item.notes',
      ]).from(
        Database.union(queryCandidates)
          .union(queryHiringAuthorities)
          .union(queryNames)
          .union(queryUnsubscribes)
          .as('item')
      );

      const superQuery = Database.select('*').from(Database.raw(':query', { query }).wrap('(', ') AS wrap')); //Aliases fields like reason_for_the_user cannot be referenced in where statements, has to wrapped

      this.applyKeywordClause(keyword, superQuery);
      this.applyWhereClause({ createdBy, isUnsubscribe, reasonId }, superQuery);
      this.applyOrderClause(orderBy, direction, superQuery);

      const result = await superQuery.paginate(page ? page : 1, perPage ? perPage : 10);

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
        message: 'There was a problem when retrieving the opt out emails',
      };
    }
  }

  /**
   * Show a list of bulk email opt out types
   *
   * @return {Object} bulk email opt out types list with a succes message or an error code
   *
   */
  async listingTypes() {
    try {
      const result = await EmailOptOutType.all();

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
        message: 'There was a problem when retrieving opt out types',
      };
    }
  }

  /**
   * Show a list of posibles emails that could be in opt out
   *
   * @description This method search in candidates, HA & names possibles matches for the email, and to make it run faster each part of the union has been limited,
   *  so it is mostly a autocomplete method more than a show how many matches are there
   *
   * @param {Object} { keyword, limit }
   *
   * @return {Object} email list with a succes message or an error code
   *
   */
  async searchPossibleEmails({ keyword, limit = 25 }) {
    try {
      const optOutQuery = this.getOptOutEmailsQuery(EmailOptOutTypes.Candidate);
      const itemsSubQuery = Database.table('contacts_directory as item')
        .select([
          'item.email',
          'item.origin_table_id as id',
          Database.raw(
            `CASE
            WHEN item.role_id = :candidate THEN :candidateOptOut
            WHEN item.role_id = :ha THEN :haOptOut
            WHEN item.role_id = :name THEN :nameOptOut
            ELSE -1
            END as email_opt_out_type_id`,
            {
              candidate: nameTypes.Candidate,
              ha: nameTypes.HiringAuthority,
              name: nameTypes.Name,
              candidateOptOut: EmailOptOutTypes.Candidate,
              haOptOut: EmailOptOutTypes.HiringAuthority,
              nameOptOut: EmailOptOutTypes.Names,
            }
          ),
          'item.full_name',
          Database.raw('count(*) over() as found'),
          'item.company as company_name',
        ])
        .where('item.searchable_text', 'ilike', `%${keyword}%`)
        .limit(limit)
        .as('item');
      const itemQuery = Database.select(['item.*', 'optout.exists'])
        .from(itemsSubQuery)
        .joinRaw(
          `left join :query on optout.item_id = item.id and optout.email_opt_out_type_id = item.email_opt_out_type_id`,
          { query: optOutQuery }
        );

      const unsubscribeQuery = Database.table('email_user_unsubscribes as item')
        .select([
          'item.email',
          Database.raw('NULL as id'),
          Database.raw('NULL as email_opt_out_type_id'),
          Database.raw('NULL as full_name'),
          Database.raw('count(*) over() as found'),
          Database.raw('NULL as company_name'),
          Database.raw('true as exists'),
        ])
        .where('item.email', 'ilike', `%${keyword}%`)
        .limit(limit);

      const query = Database.select([
        'item.id',
        'item.email',
        Database.raw('COALESCE(item.exists, false) as exists'),
        'item.email_opt_out_type_id',
        'item.full_name',
        'item.found',
        'item.company_name',
      ])
        .from(Database.union(itemQuery, true).union(unsubscribeQuery, true).as('item'))
        .limit(limit)
        .orderBy('email_opt_out_type_id', 'asc');

      const result = await query;

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
        message: 'There was a problem when retrieving the possibles opt outs',
      };
    }
  }

  /**
   * Returns the opt out with its display information, something like the listing method does, but just for one
   *
   * @summary This method is expected to be used whenever a opt out display information is needed, something like the listing method returns (the data has been heavily processed)
   *
   * @param {Number} id - The opt out table id
   *
   * @return {Object} optOutInfo
   */
  async getOptOutInformation(id) {
    const queryCandidates = Database.table('email_opt_outs as optout')
      .select([
        'optout.id',
        'optout.created_at',
        'reason.description',
        'optout.custom_reason',
        'pi.full_name as created_by_name',
        'optout.created_by',
        'optout.item_id',
        'optout.email_opt_out_type_id',
        'item.email',
        'itempi.full_name as item_full_name',
        Database.raw('false as is_unsubscribe'),
        'types.title',
        'optout.notes',
      ])
      .leftJoin('unsubscribe_reasons as reason', 'optout.unsubscribe_reason_id', 'reason.id')
      .leftJoin('email_opt_out_types as types', 'optout.email_opt_out_type_id', 'types.id')
      .innerJoin('candidates as item', 'optout.item_id', 'item.id')
      .innerJoin('personal_informations as itempi', 'item.personal_information_id', 'itempi.id')
      .innerJoin('users', 'users.id', 'optout.created_by')
      .innerJoin('personal_informations as pi', 'users.personal_information_id', 'pi.id')
      .where('optout.email_opt_out_type_id', EmailOptOutTypes.Candidate)
      .where('optout.id', id);

    const queryHiringAuthorities = Database.table('email_opt_outs as optout')
      .select([
        'optout.id',
        'optout.created_at',
        'reason.description',
        'optout.custom_reason',
        'pi.full_name as created_by_name',
        'optout.created_by',
        'optout.item_id',
        'optout.email_opt_out_type_id',
        'item.work_email as email',
        'item.full_name as item_full_name',
        Database.raw('false as is_unsubscribe'),
        'types.title',
        'optout.notes',
      ])
      .leftJoin('unsubscribe_reasons as reason', 'optout.unsubscribe_reason_id', 'reason.id')
      .leftJoin('email_opt_out_types as types', 'optout.email_opt_out_type_id', 'types.id')
      .innerJoin('hiring_authorities as item', 'optout.item_id', 'item.id')
      .innerJoin('users', 'users.id', 'optout.created_by')
      .innerJoin('personal_informations as pi', 'users.personal_information_id', 'pi.id')
      .where('optout.email_opt_out_type_id', EmailOptOutTypes.HiringAuthority)
      .where('optout.id', id);

    const queryNames = Database.table('email_opt_outs as optout')
      .select([
        'optout.id',
        'optout.created_at',
        'reason.description',
        'optout.custom_reason',
        'pi.full_name as created_by_name',
        'optout.created_by',
        'optout.item_id',
        'optout.email_opt_out_type_id',
        'item.email',
        'itempi.full_name as item_full_name',
        Database.raw('false as is_unsubscribe'),
        'types.title',
        'optout.notes',
      ])
      .leftJoin('unsubscribe_reasons as reason', 'optout.unsubscribe_reason_id', 'reason.id')
      .leftJoin('email_opt_out_types as types', 'optout.email_opt_out_type_id', 'types.id')
      .innerJoin('names as item', 'optout.item_id', 'item.id')
      .innerJoin('personal_informations as itempi', 'item.personal_information_id', 'itempi.id')
      .innerJoin('users', 'users.id', 'optout.created_by')
      .innerJoin('personal_informations as pi', 'users.personal_information_id', 'pi.id')
      .where('optout.email_opt_out_type_id', EmailOptOutTypes.Names)
      .where('optout.id', id);

    const query = Database.select([
      'item.id',
      Database.raw("COALESCE(item.description, '') as chosen_reason"),
      Database.raw("COALESCE(item.custom_reason, '') as custom_reason"),
      Database.raw(
        "COALESCE((CASE\
    WHEN custom_reason IS NULL OR custom_reason = '' THEN\
      description\
    ELSE\
      CONCAT(description,': ',custom_reason)\
    END), '') as reason_for_the_user"
      ),
      'item.created_at',
      'item.created_by',
      'item.item_id',
      'item.email_opt_out_type_id',
      'item.email',
      'item.created_by_name',
      'item.item_full_name',
      'item.is_unsubscribe',
      'item.title',
      'item.notes',
    ]).from(Database.union(queryCandidates).union(queryHiringAuthorities).union(queryNames).as('item'));

    return await query.first();
  }

  /**
   * Returns the query used to get the items from the opt outs (not including the unsubscribe)
   *
   * @summary This method allows the code to be cleaner, since it can be used anywhere else where only the opt outs emails are required & a query object must be returned
   *
   * @return {Database} query
   */
  getOptOutEmailsQuery() {
    return Database.table('email_opt_outs as optout')
      .select(['item_id', Database.raw('true as exists'), 'email_opt_out_type_id'])
      .as('optout');
  }

  /**
   * Creates a email opt out
   *
   * @param {Object} optOutData = {item_id, email_opt_out_type_id, unsubscribe_reason_id, custom_reason}
   * @param {String} userId
   * @summary Create a email opt out
   *
   * @return {Object} email opt out created
   *
   */
  async create(optOutData, userId) {
    try {
      const unsubscribeReason = await UnsubscribeReason.find(optOutData.unsubscribe_reason_id);
      let affectedEmail = '';

      if (unsubscribeReason.unsubscribe_reason_type_id !== UnsubscribeReasonTypes.Recruiter.id) {
        return {
          success: false,
          code: 400,
          message: 'The provided unsubscribe reason is not valid',
        };
      }

      switch (optOutData.email_opt_out_type_id) {
        case EmailOptOutTypes.Candidate:
          const candidate = await CandidateRepository.details(optOutData.item_id, true);
          if (!candidate) {
            return {
              success: false,
              code: 404,
              message: 'Candidate not found',
            };
          }

          affectedEmail = candidate.email;

          break;

        case EmailOptOutTypes.HiringAuthority:
          const hiringAutority = await HiringAuthorityRepository.findWithAll(optOutData.item_id);
          if (!hiringAutority) {
            return {
              success: false,
              code: 404,
              message: 'Hiring authority not found',
            };
          }

          affectedEmail = hiringAutority.work_email;

          break;

        case EmailOptOutTypes.Names:
          const name = await NameRepository.details(optOutData.item_id, true);
          if (!name) {
            return {
              success: false,
              code: 404,
              message: 'Name not found',
            };
          }

          affectedEmail = name.email;

          break;

        default:
          return {
            success: false,
            code: 404,
            message: 'Opt out type does not exists',
          };
      }

      if (
        await EmailOptOut.query()
          .where('item_id', optOutData.item_id)
          .andWhere('email_opt_out_type_id', optOutData.email_opt_out_type_id)
          .first()
      ) {
        return {
          success: false,
          code: 409,
          message: 'That opt out already exists',
        };
      }

      const emailOptOut = await EmailOptOut.create({
        created_by: userId,
        item_id: optOutData.item_id,
        email_opt_out_type_id: optOutData.email_opt_out_type_id,
        unsubscribe_reason_id: optOutData.unsubscribe_reason_id,
        custom_reason: optOutData.custom_reason ? optOutData.custom_reason : '',
        notes: optOutData.notes,
      });

      const result = emailOptOut.toJSON();

      Event.fire(EventTypes.BulkEmail.OptOutCreated, {
        email: affectedEmail,
        entity: EntityTypes.OptOut,
        operation: OperationType.Create,
        payload: { sent: optOutData, result },
        userId: userId,
      });

      const optOutInformation = await this.getOptOutInformation(result.id);

      return {
        success: true,
        code: 201,
        data: optOutInformation,
      };
    } catch (error) {
      const properties = {
        error,
        payload: {
          optOutData,
          userId,
        },
      };

      appInsights.defaultClient.trackException({ exception: error });
      appInsights.defaultClient.trackEvent({ name: 'Bulk Email Opt Out Failed', properties });

      return {
        success: false,
        code: 500,
        message: 'There was a problem while creating the bulk email opt out',
      };
    }
  }

  /**
   * Log a company change
   *
   * @method logChange
   *
   * @description Use this whenever a change is made to a opt out & is deemed important to record in the audit trail
   *
   * @param {Number} companyId - The company that suffered the change
   * @param {String} entity - What changed in the company (type, ..., etc)
   * @param {String} operation - Related operation (create, update, delete)
   * @param {Object} payload - Content of the changed object
   * @param {Number} userId - Who made the change
   *
   */
  async logChange(email, entity, operation, payload, userId) {
    try {
      await OptOutChangeLog.create({
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
   * Returns the email of one opt out
   *
   * @description This method allows to obtain the lucid model of either a unsubscribe, or a opt out
   *
   * @param {Database} emailOptOut - The database model EmailOptOut
   *
   * @return {String} The opt out email
   */
  async getOptOutEmail(emailOptOut) {
    switch (emailOptOut.email_opt_out_type_id) {
      case EmailOptOutTypes.Candidate:
        const candidate = await Candidate.findOrFail(emailOptOut.item_id);
        return candidate.email;

      case EmailOptOutTypes.HiringAuthority:
        const hiringAutority = await HiringAuthority.findOrFail(emailOptOut.item_id);
        return hiringAutority.work_email;

      case EmailOptOutTypes.Names:
        const name = await Name.findOrFail(emailOptOut.item_id);
        return name.email;
    }
  }

  /**
   * Obtains a opt out or unsubscribe by the id
   *
   * @description This method allows to obtain the lucid model of either a unsubscribe, or a opt out
   *
   * @param {Number} id - The optout/unsubscribe id
   * @param {Boolean} isUnsubscribe - If the id belongs to a unsubscribe or not
   *
   * @return {Database} The lucid model
   */
  async getOptOutOrUnsubscribe(id, isUnsubscribe) {
    if (isUnsubscribe) {
      const unsubscribe = await EmailUserUnsubscribe.findOrFail(id);
      return { optOut: unsubscribe, email: unsubscribe.email };
    } else {
      const optOut = await EmailOptOut.findOrFail(id);
      const email = await this.getOptOutEmail(optOut);
      return { optOut, email };
    }
  }

  /**
   * Delete one email opt out or unsubscribe, called from a user
   *
   * @param {Number} id - The optout/unsubscribe id
   * @param {Number} userId - Who is doing the operation
   * @param {Boolean} isUnsubscribe - If the id belongs to a unsubscribe or not
   *
   * @return {Object} Bulk email opt out deleted with a succes message or an error code
   */
  async destroy(id, userId, isUnsubscribe) {
    try {
      const { optOut, email } = await this.getOptOutOrUnsubscribe(id, isUnsubscribe);

      if (!optOut) {
        return {
          success: false,
          code: 404,
          message: 'Bulk email opt out not found',
        };
      }

      await optOut.delete();

      const result = optOut.toJSON();

      Event.fire(EventTypes.BulkEmail.OptOutDeleted, {
        email,
        entity: EntityTypes.OptOut,
        operation: OperationType.Delete,
        payload: { sent: { id, userId, isUnsubscribe }, result },
        userId: userId,
      });

      return {
        success: true,
        code: 200,
        data: result,
      };
    } catch (error) {
      if (error.name === 'ModelNotFoundException') {
        return {
          success: false,
          code: 404,
          message: 'Bulk email opt out not found',
        };
      }

      appInsights.defaultClient.trackException({ exception: error });
      return {
        success: false,
        code: 500,
        message: 'There was a problem when deleting the opt out',
      };
    }
  }

  /**
   * Delete one unsubscribe
   *
   * @description This method should be called only when destroying a unsubscription from the sendgrid events, since it will be rarely be destroyed outside that
   *
   * @param {String} email
   * @param {Number} timestamp
   *
   * @return {Boolean} Unsubscribe deleted?
   */
  async destroySendgridUnsubscribe(email, timestamp = 0) {
    try {
      const unsubscribe = await EmailUserUnsubscribe.query().where({ email }).first();

      if (!unsubscribe) return false;

      if (unsubscribe.toJSON().sendgrid_timestamp && unsubscribe.toJSON().sendgrid_timestamp > timestamp) return false;

      Event.fire(EventTypes.BulkEmail.OptOutDeleted, {
        email,
        entity: EntityTypes.OptOut,
        operation: OperationType.Delete,
        payload: { sent: { email, timestamp }, result: unsubscribe.toJSON() },
      });

      return unsubscribe.delete();
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
      return {
        success: false,
        code: 500,
        message: 'There was a problem while deleting the unsubscribe',
      };
    }
  }

  /**
   * Creates a email unsubscribe, this method should not have to be authenticated beforehand, since it is expected to be used out side the main website
   *
   * @param {Object} unsubscribeData = {email, email_history_id, unsubscribe_reason_id, custom_reason}
   * @param {Object} timestamp - Only needed when the system/sendgrid creates the unsubscribe
   *
   * @summary Create a email unsubscribe, which should act as a email opt out but generated from the end user
   *
   * @return {Object} email opt out created
   *
   */
  async createUnsubscribe(unsubscribeData, timestamp = null) {
    try {
      const unsubscribeReason = await UnsubscribeReason.find(unsubscribeData.unsubscribe_reason_id);

      if (unsubscribeReason.unsubscribe_reason_type_id !== UnsubscribeReasonTypes.User.id) {
        return {
          success: false,
          code: 400,
          message: 'The selected unsubscribe reason is invalid',
        };
      }

      if (await EmailUserUnsubscribe.query().where('email', unsubscribeData.email).first()) {
        return {
          success: false,
          code: 409,
          message: 'You have already been unsubscribed from us!',
        };
      }

      const emailHistoryFound = unsubscribeData.email_history_id
        ? await EmailHistory.query().where('id', unsubscribeData.email_history_id).first()
        : false;

      const emailUnsubscribe = await EmailUserUnsubscribe.create({
        email: unsubscribeData.email,
        email_history_id: emailHistoryFound ? unsubscribeData.email_history_id : null,
        unsubscribe_reason_id: unsubscribeData.unsubscribe_reason_id,
        custom_reason: unsubscribeData.custom_reason ? unsubscribeData.custom_reason : '',
        sendgrid_timestamp: timestamp,
      });

      const result = emailUnsubscribe.toJSON();

      Event.fire(EventTypes.BulkEmail.OptOutCreated, {
        email: unsubscribeData.email,
        entity: EntityTypes.OptOut,
        operation: OperationType.Create,
        payload: { sent: unsubscribeData, result },
      });

      return {
        success: true,
        code: 201,
        data: result,
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      return {
        success: false,
        code: 500,
        message: 'There was a problem while creating your unsubscribe',
      };
    }
  }

  /**
   * Creates an email unsubscribe, but from fortpac
   *
   * @summary Sometimes OPs team needs to add an email that is not created yet into fortpac,
   *  so a quick solution would that they can create simple unsubscribes, just the reason is needed
   *
   * @param {Object} optOutData - Contains the data necessary to create the unsubscribe
   * @param {String} optOutData.manual_email - The email for the unsubscribe
   * @param {String} optOutData.notes - Notes
   * @param {String} optOutData.custom_reason - The custom reason, necessary when selecting 'other'
   * @param {Number} optOutData.unsubscribe_reason_id - The reason id
   * @param {String} userId - Who is creating the unsubscribe
   *
   * @return {Object} email unsubscribe created
   */
  async createUnsubscribeFromFortpac(optOutData, userId) {
    try {
      const { unsubscribe_reason_id: reasonId, notes, custom_reason } = optOutData;
      const manualEmail = String(optOutData.manual_email).formatToCompare();

      const unsubscribeReason = await UnsubscribeReason.find(reasonId);
      if (unsubscribeReason.unsubscribe_reason_type_id !== UnsubscribeReasonTypes.Recruiter.id) {
        return {
          success: false,
          code: 400,
          message: 'The provided unsubscribe reason is not valid',
        };
      }

      const unsubscribeFound = await EmailUserUnsubscribe.query()
        .whereRaw('LOWER(email) = :manualEmail', { manualEmail })
        .first();
      if (unsubscribeFound) {
        return {
          success: false,
          code: 409,
          message: 'That opt out already exists',
        };
      }

      const emailOptOut = await EmailUserUnsubscribe.create({
        created_by: userId,
        email: manualEmail,
        unsubscribe_reason_id: reasonId,
        custom_reason: custom_reason ? custom_reason : '',
        notes: notes,
      });

      const result = emailOptOut.toJSON();

      Event.fire(EventTypes.BulkEmail.OptOutCreated, {
        email: manualEmail,
        entity: EntityTypes.OptOut,
        operation: OperationType.Create,
        payload: { sent: optOutData, result },
        userId,
      });

      const optOutInformation = await this.getManualUnsubscribeInformation(result.id);

      return {
        success: true,
        code: 201,
        data: optOutInformation,
      };
    } catch (error) {
      const properties = {
        error,
        payload: {
          optOutData,
          userId,
        },
      };

      appInsights.defaultClient.trackException({ exception: error });
      appInsights.defaultClient.trackEvent({ name: 'Bulk Email Opt Out Unsubscribe Failed', properties });

      return {
        success: false,
        code: 500,
        message: 'There was a problem while creating the bulk email unsubscribe',
      };
    }
  }

  /**
   * Returns the unsubscribe with its display information, something like the listing method does, but just for one
   *
   * @summary This method is expected to be used whenever a unsubscribe display information is needed, something like the listing method returns (the data has been heavily processed)
   *
   * @param {Number} id - The unsubscribe table id
   *
   * @return {Object} unsubscribeInfo
   */
  async getManualUnsubscribeInformation(id) {
    const query = Database.table('email_user_unsubscribes as unsub')
      .select([
        'unsub.id',
        Database.raw("COALESCE(reason.description, '') as chosen_reason"),
        Database.raw("COALESCE(unsub.custom_reason, '') as custom_reason"),
        Database.raw(
          "COALESCE((CASE\
            WHEN custom_reason IS NULL OR custom_reason = '' THEN\
              description\
            ELSE\
              CONCAT(description,': ',custom_reason)\
            END), '') as reason_for_the_user"
        ),
        'unsub.created_at',
        Database.raw('NULL as item_id'),
        Database.raw(':id as email_opt_out_type_id', { id: EmailOptOutTypes.User }),
        'unsub.email',
        Database.raw("COALESCE(pi.full_name, 'System') as created_by_name"),
        'unsub.created_by',
        Database.raw('NULL as item_full_name'),
        Database.raw('true as is_unsubscribe'),
        'types.title',
        'unsub.notes',
      ])
      .leftJoin('users', 'users.id', 'unsub.created_by')
      .leftJoin('personal_informations as pi', 'users.personal_information_id', 'pi.id')
      .leftJoin('unsubscribe_reasons as reason', 'unsub.unsubscribe_reason_id', 'reason.id')
      .leftJoin('email_opt_out_types as types', EmailOptOutTypes.User, 'types.id')
      .where('unsub.id', id);

    return await query.first();
  }

  /**
   * Return the where clause to apply on the query.
   * GET where clause
   *
   */
  applyKeywordClause(keyword, query) {
    if (keyword) {
      query.where((builder) =>
        builder.where('email', 'ilike', `%${keyword}%`).orWhere('reason_for_the_user', 'ilike', `%${keyword}%`)
      );
    }
  }

  /**
   * Apply the order clause on the query.
   *
   * @method applyOrderClause
   *
   * @param {String} orderBy
   * @param {String} direction
   * @param {Knex} query
   *
   */
  applyOrderClause(orderBy, direction, query) {
    const orderByParameter = orderBy ? orderBy : 'created_at';

    const validDirections = ['asc', 'desc'];
    const orderingOptions = ['is_unsubscribe', 'email', 'reason_for_the_user', 'created_by_name', 'created_at'];

    const orderDirection = validDirections.find((dir) => dir === direction) || validDirections[1];
    const orderClause = orderingOptions.find((element) => element === orderByParameter);

    if (orderClause) {
      query.orderBy(orderClause, orderDirection);
    }
  }

  /**
   * Apply the where clause on the query.
   *
   * @method applyWhereClause
   *
   * @param {Knex} query
   *
   */
  applyWhereClause({ createdBy, isUnsubscribe, reasonId }, query) {
    if (createdBy) {
      query.andWhere('created_by', createdBy);
    }

    if (isUnsubscribe !== null && isUnsubscribe !== undefined) {
      query.andWhere('is_unsubscribe', isUnsubscribe);
    }

    if (reasonId) {
      query.andWhere('reason_id', reasonId);
    }
  }
}

module.exports = BulkEmailOptOutRepository;
