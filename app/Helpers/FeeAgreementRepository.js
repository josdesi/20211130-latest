'use strict';
//Exception
const NotFoundException = use('App/Exceptions/NotFoundException')
const ForbiddenException = use('App/Exceptions/ForbiddenException')
const BadRequestException = use('App/Exceptions/BadRequestException')

const Antl = use('Antl');
//Utils
const Env = use('Env');
const moment = require('moment');
const appInsights = require("applicationinsights");
const promiseRetry = require('promise-retry');
const { uploadFile, copyFile } = use('App/Helpers/FileHelper');
const TimeoffHelper = use('App/Helpers/TimeoffHelper');
const { 
  SignatureProvider,
  ConversionFeeAgreementDeclinableField,
  FeeAgreementPaymentSchemes,
  FeeAgreementStatus,
  FeeAgreementEventType,
  FlatFeeAgreementDeclinableField,
  StandardFeeAgreementDeclinableField,
  userRoles,
  parseDateWithOffset,
  FeeAgreementSignatureProcessType,
  FeeAgreementFileEntitySources,
  DateFormats,
  addToggler
} = use('App/Helpers/Globals');
const helloSignProvider = use('Services/HelloSign');
const DocuSign = use('Services/DocuSign');
const Database = use('Database');
const Event = use('Event');
const EventType = use('App/Helpers/Events');
const FeeAgreementContractManager = use('App/Helpers/FeeAgreementContractManager');

//Models
const FeeAgreementEventTypeModel = use('App/Models/FeeAgreementEventType');
const HiringAuthority = use('App/Models/HiringAuthority');
const HiringAuthorityRepository = new (use('App/Helpers/HiringAuthorityRepository'))();
const Company = use('App/Models/Company');
const CompanyFeeAgreement = use('App/Models/CompanyFeeAgreement');
const FeeAgreementEventLog = use('App/Models/FeeAgreementEventLog');
const HelloSignEvent = use('App/Models/HelloSignEvent');
const User = use('App/Models/User');
const FeeAgreementStatusCalculator = use('App/Helpers/FeeAgreementStatusCalculator');
//Repositories
const UserRepository = new (use('App/Helpers/UserRepository'))();
const ModulePresetsConfigRepository = new (use('App/Helpers/ModulePresetsConfigRepository'))();
const DocusignFeeAgreementEventProcessor = use('App/Helpers/DocusignFeeAgreementEventProcessor');
//Emails.
const GenericSendgridTemplateEmail = new (use('App/Emails/GenericSendgridTemplateEmail'))();
const FeeAgreementEmails = new (use('App/Emails/FeeAgreementEmails'))();

class FeeAgreementRepository {
  constructor() {
    this.docusignFeeAgreementEventProcessor = new DocusignFeeAgreementEventProcessor();
    this.feeAgreementStatusCalculator = new FeeAgreementStatusCalculator();
    const fillContractDataWithHelloSign = (feeAgreement, contractSentDetails) => {
      feeAgreement.contract_id = contractSentDetails.signature_request.signature_request_id;
      feeAgreement.sign_url = contractSentDetails.signature_request.signing_url;
    };

    const fillContractDataWithDocuSign = (feeAgreement, contractSentDetails) => {
      feeAgreement.contract_id = contractSentDetails.envelopeId;
      //feeAgreement.sign_url = contractSentDetails.signature_request.signing_url; --TODO: check if it's possible to get something similar
    };
    this.fillContractInformationMap = {
      [SignatureProvider.HelloSign]: fillContractDataWithHelloSign,
      [SignatureProvider.DocuSign]: fillContractDataWithDocuSign,
    };
    this._filterResolvers = {
      fee_agreement_status_id: this.defaultFilterResolver,
      status_groups_ids: this.inQueryResolver,
      status_ids: this.inQueryResolver,
      company_id: this.defaultFilterResolver,
      recruiter_id: this.defaultFilterResolver,
      coach_id: this.defaultFilterResolver,
      regional_director_id: this.defaultFilterResolver,
      guarantee_days: this.defaultFilterResolver,
      min_fee_percentage: this.operatorFilterResolverFactory('>='),
      max_fee_percentage: this.operatorFilterResolverFactory('<='),
      start_date_range: this.operatorFilterResolverFactory('>='),
      end_date_range: this.operatorFilterResolverFactory('<='),
      start_created_at: this.operatorFilterResolverFactory('>='),
      end_created_at: this.operatorFilterResolverFactory('<='),
      start_validated_date: this.operatorFilterResolverFactory('>='),
      end_validated_date: this.operatorFilterResolverFactory('<='),
      start_signed_date: this.operatorFilterResolverFactory('>='),
      end_signed_date: this.operatorFilterResolverFactory('<='),
      responsible_role_id:  this.defaultFilterResolver,
      keyword: this.applyKeywordFilters,
      industry_id: this.defaultFilterResolver,
      specialty_id: this.defaultFilterResolver,
      subspecialty_id: this.defaultFilterResolver,
      regional_director_ids: this.defaultFilterResolver,

      companyIds: this.inQueryResolver,
      countryIds: this.inQueryResolver,
      recruiterIds: this.inQueryResolver,
      coachIds: this.inQueryResolver,
      regionalDirectorIds: this.inQueryResolver,
      responsibleRoleIds:  this.inQueryResolver,
      industryIds: this.inQueryResolver,
      specialtyIds: this.inQueryResolver,
      subspecialtyIds: this.inQueryResolver,
      guaranteeDaysIn: this.inQueryResolver,
      regionalDirectorIds: this.inQueryResolver,
      signatureProcessTypeId: this.inQueryResolver
    };
    this._orderColumnsMap = {
      status: 'fas.title',
      company_name: 'cp.name',
      id: 'fa.id',
      fee_percentage: 'fa.fee_percentage',
      guarantee_days: 'fa.guarantee_days',
      regional_director_name: 'regional_director.full_name',
      coach_name: 'coach.user_name',
      creator_name: 'recruiter.user_name',
      industry_title: 'spec.industry',
      specialty_title: 'spec.title',
      subspecialty_title: 'subspec.title',
      created_at: 'fa.created_at',
      validated_date: 'fa.validated_date',
      hiring_authority_sign_date: 'fa.hiring_authority_sign_date',
      signed_date: 'fa.production_director_signed_date',
      regional_director: 'regional_director.user_name'
    };
    this._filterColumnsMap = {
      status_ids: 'fas.id',
      fee_agreement_status_id: 'fasg.id',
      status_groups_ids: 'fasg.id',
      company_id: 'cp.id',
      recruiter_id: 'fa.creator_id',
      coach_id: 'fa.coach_id',
      guarantee_days: 'fa.guarantee_days',
      min_fee_percentage: 'fee_percentage',
      max_fee_percentage: 'fee_percentage',
      responsible_role_id: 'fas.responsible_role_id',
      keyword: [Database.raw('fa.id::text'), 'cp.name', 'recruiter.user_name', 'coach.user_name'],
      start_date_range: 'fa.created_at',
      end_date_range: 'fa.created_at',
      start_created_at: 'fa.created_at',
      end_created_at: 'fa.created_at',
      start_validated_date: 'fa.validated_date',
      end_validated_date: 'fa.validated_date',
      start_signed_date: 'fa.signed_date',
      end_signed_date: 'fa.signed_date',
      industry_id: 'spec.industry_id',
      specialty_id: 'spec.id',
      subspecialty_id : 'subspec.id',

      companyIds: 'cp.id',
      countryIds: 'city.country_id',
      recruiterIds: 'fa.creator_id',
      coachIds: 'fa.coach_id',
      responsibleRoleIds:  'fas.responsible_role_id',
      industryIds: 'spec.industry_id',
      specialtyIds: 'spec.id',
      subspecialtyIds: 'subspec.id',
      guaranteeDaysIn: 'fa.guarantee_days',
      regionalDirectorId: 'fa.regional_director_id',
      regionalDirectorIds: 'fa.regional_director_id',
      signatureProcessTypeId: 'fa.signature_process_type_id'
    };
    this.helloSignEventHandlers = {
      signature_request_downloadable: this.handleDownloadableEvent,
      signature_request_signed: this.handleSignedEvent,
      signature_request_sent: this.handleSignatureRequestSent,
      signature_request_viewed: this.handleSignatureRequestViewed,
      signature_request_email_bounce: this.handleSignatureRequestEmailBounce,
      signature_request_remind: this.handleSignatureRequestReminded
    };
    this._orderDirections = ['ASC', 'DESC'];
    this.timeOffHelper = new TimeoffHelper({
      cutoffTime: Env.get('BOARDS_CUTOFF_TIME') || '20:00',
      timezone: Env.get('BOARDS_TIMEZONE') || 'US/Central'
    });
  }

  async getFeeAgreementStatusesForUser(userId) {
    const roleId = await this.getHighestRoleId(userId);
    const statuses = Database
      .table('fee_agreement_statuses')
      .select(['id', 'style_class_name', Database.raw(`COALESCE(title, internal_name) as title`)])
      .whereRaw('? in (select unnest(roles_that_can_watch))', roleId)
      .orderBy('fee_agreement_statuses.id');
    return statuses;
  }

  async getResponsibleRolesForUser(userId) {
    const roleId = await this.getHighestRoleId(userId);
    const roles = await Database
      .table('fee_agreement_statuses')
      .select(['roles.id', 'roles.title'])
      .innerJoin('roles', 'roles.id', 'fee_agreement_statuses.responsible_role_id')
      .whereRaw('? in (select unnest(roles_that_can_watch))', roleId);
    return roles;
  }

  async getSignedFeeAgreementsByCompany(companyId) {
    const feeAgreements = await CompanyFeeAgreement.query()
      .where('company_id', companyId)
      .with('feeAgreementStatus', (builder) =>   {
        builder.select(['id', 'internal_name'])
      })
      .with('feeAgreementStatus.group', (builder) =>   {
        builder.select(['id', 'title', 'style_class_name'])
      })
      .whereNotIn('fee_agreement_status_id', [FeeAgreementStatus.Canceled, FeeAgreementStatus.Void, FeeAgreementStatus.Expired])
      .orderBy('id', 'desc')
      .fetch();
    return feeAgreements;
  }

  async getContractTemplates(page, pageSize) {
    const templates = await helloSignProvider.listTemplates(page, pageSize);
    return templates;
  }

  async show(id) {
    const companyFeeAgreement = await CompanyFeeAgreement
      .query()  
      .where('id', id) 
      .first();
    
    if (!companyFeeAgreement) {
      return {
        code: 404,
        success: false,
        message: Antl.formatMessage('feeAgreement.error.notFound'),
      };
    }
    await this.loadRelations(companyFeeAgreement);
    return {
      code: 200,
      success: true,
      data: companyFeeAgreement
    };
  }

  buildFeeAgreementsBaseQuery() {
    return Database
      .table('company_fee_agreements as fa')
      .innerJoin('companies as cp', 'cp.id', 'fa.company_id')
      .innerJoin('v_cities as city', 'city.id', 'cp.city_id')
      .leftJoin('v_specialties as spec', 'spec.id', 'cp.specialty_id')
      .leftJoin('subspecialties as subspec', 'subspec.id', 'cp.subspecialty_id')
      .leftJoin('hiring_authorities as ha', 'ha.id', 'fa.hiring_authority_id')
      .innerJoin('fee_agreement_statuses as fas', 'fas.id', 'fa.fee_agreement_status_id')
      .innerJoin('fee_agreement_status_groups as fasg', 'fasg.id', 'fas.status_group_id')
      .innerJoin('v_users as recruiter', 'recruiter.id', 'fa.creator_id')
      .leftJoin('v_users as coach', 'coach.id', 'fa.coach_id')
      .leftJoin('v_users as production_director', 'production_director.id', 'fa.production_director_signer_id')
      .leftJoin('v_users as regional_director', 'regional_director.id', 'fa.regional_director_id');
  }

  async listForUser(inputFilters, orderOptions, paginationOptions, userId) {
    const filters = this.unWrapFilters(inputFilters);
    const {direction = 'asc' , orderBy } = orderOptions;
    const {page = 1, perPage = 10} = paginationOptions; 
    const query = this.buildFeeAgreementsBaseQuery()
      .select([
        Database.raw(`
        json_build_object(
          'id', fas.id,
          'status_group_id', fasg.id,
          'status', COALESCE(fas.title, fas.internal_name),
          'status_group', fasg.title,
          'style_class_name', fas.style_class_name,
          'group_style_class_name', fasg.style_class_name,
          'current_responsible', fa.current_responsible,
          'responsible_role_id', fas.responsible_role_id
          ) as status`),
        'fas.style_class_name as style_class_name',
        'cp.name as company_name',
        'fa.id as id',
        'fa.fee_percentage',
        'fa.flat_fee_amount',
        'fa.fee_agreement_payment_scheme_id',
        'fa.guarantee_days',
        'coach.user_name as coach_name',
        'recruiter.user_name as creator_name',
        'regional_director.user_name as regional_director',
        'production_director.user_name as production_director_validator',
        'fa.signed_date',
        'fa.validated_date',
        'fa.company_id as company_id',
        'creator_id',
        'sign_url',
        'pdf_url',
        'fa.verbiage_changes_requested',
        'fa.hiring_authority_sign_date',
        'fa.production_director_signed_date',
        'fa.last_resend_time',
        'fa.created_at',
        'fa.validated_date',
        'spec.industry_id as industry_id', 
        'spec.industry as industry_title', 
        'spec.id as specialty_id', 
        'spec.title as specialty_title',
        'subspec.id as subspecialty_id', 
        'subspec.title as subspecialty_title',
      ]);
      const filteredStatuses = [...new Set ([
        ...(filters.status_ids || []),
        ...(filters.fee_agreement_status_id || [])
      ])];
      const appliedRole = await this.applyUserScope(query, userId, filteredStatuses);
      await this.applyHiddedForRoleScope(query, appliedRole, filteredStatuses);
      this.applyFilters(query, filters);
      this.defaultOrderResolver(query, orderBy, direction);
      return await query.paginate(page, perPage);
  }

  async applyHiddedForRoleScope(query, role, filteredStatuses) {
    const statusesHidedDefault = (await Database
      .from('fee_agreement_statuses')
      .select('id')
      .whereRaw('? in (select unnest(hide_by_default_for_roles))', [role.role_id])).map(({id}) => id);
    const statusesToHide = statusesHidedDefault.filter(id => !filteredStatuses.map(id => Number(id)).includes(id));
    query.whereNotIn('fas.id', statusesToHide);
  }

  async applyUserScope(query, userId) {
    const isOperations = await UserRepository.hasRole(userId, userRoles.Operations);
    if (isOperations) {
      await this.applyOperationsScope(query, userId);
      return isOperations;
    }

    const isProductionDirector = await UserRepository.hasRole(userId, userRoles.ProductionDirector);
    if (isProductionDirector) {
      await this.applyProductionDirectorScope(query, userId);
      return isProductionDirector;
    }
    const isRegionalDirector = await UserRepository.hasRole(userId, userRoles.RegionalDirector);
    if (isRegionalDirector) {
      await this.applyRegionalDirectorScope(query, userId);
      return isRegionalDirector;
    }

    const isCoach = await UserRepository.hasRole(userId, userRoles.Coach);
    if (isCoach) {
      await this.applyCoachScope(query, userId);
      return isCoach;
    }

    const isRecruiter = await UserRepository.hasRole(userId, userRoles.Recruiter);
    if (isRecruiter) {
      await this.applyRecruiterScope(query, userId);
      return isRecruiter;
    }
  }

  async applyOperationsScope(query) {
    this.applyRoleStatusScope(query, userRoles.Operations);
  }

  async applyProductionDirectorScope(query) {
    this.applyRoleStatusScope(query, userRoles.ProductionDirector);
  }

  async applyRegionalDirectorScope(query, userId) {
    this.applyRoleStatusScope(query, userRoles.RegionalDirector);
    query.whereRaw('fa.coach_id in (select coach_id from recruiter_has_industries where regional_director_id = ?)', [userId]);
  }

  async applyCoachScope(query, userId) {
    this.applyRoleStatusScope(query, userRoles.Coach);
    query.where('fa.coach_id', userId);
  }

  async applyRecruiterScope(query, userId) {
    this.applyRoleStatusScope(query, userRoles.Coach);
    query.where('creator_id', userId);
  }

  applyRoleStatusScope(query, roleId) {
    query.whereRaw(`fee_agreement_status_id in (
      select id from fee_agreement_statuses where ? in (select unnest(roles_that_can_watch))
    )`, roleId);
  }

  async updateAssociatedWhiteSheets(feeAgreementId, externalTransaction) {
    const transaction = externalTransaction ? externalTransaction : await Database.beginTransaction();
    const isAtomic = transaction && (!externalTransaction);
    try {
      await Database.table('white_sheets')
        .where('company_fee_agreement_id', feeAgreementId)
        .update({discussing_agreement_complete: 1})
        .transacting(externalTransaction);
      isAtomic && (await transaction.commit());
    } catch(error) {
      isAtomic && (await transaction.rollback());
      throw error;
    }
  }

  async associateToWhiteSheets(feeAgreementId, companyId, jobOrderIds, externalTransaction) {
    const transaction = externalTransaction ? externalTransaction : await Database.beginTransaction();
    const isAtomic = transaction && (!externalTransaction);
    try {
      const jobOrdersSubQuery = Database
        .table('job_orders')
        .select(['id'])
        .where('company_id', companyId)
        .whereIn('id', jobOrderIds);

      await Database.table('white_sheets')
        .whereIn('job_order_id', jobOrdersSubQuery)
        .update({company_fee_agreement_id: feeAgreementId})
        .transacting(externalTransaction);
      isAtomic && (await transaction.commit());
    } catch(error) {
      isAtomic && (await transaction.rollback());
      throw error;
    }
  }

  async deleteAssociationFromWhiteSheet(feeAgreementId, externalTransaction) {
    const transaction = externalTransaction ? externalTransaction : await Database.beginTransaction();
    const isAtomic = transaction && (!externalTransaction);
    try {
      await Database.table('white_sheets')
        .where('company_fee_agreement_id', feeAgreementId)
        .update({company_fee_agreement_id: null})
        .transacting(externalTransaction);
      isAtomic && (await transaction.commit());
    } catch(error) {
      isAtomic && (await transaction.rollback());
      throw error;
    }
  }

  async companyHasJobOrdersToSign(companyId) {
    const  {count} = await Database.table('job_orders')
      .join('white_sheets', 'job_orders.id', 'white_sheets.job_order_id')
      .where(builder => {
        builder.where('white_sheets.company_prepared_to_sign_service_agreement', '=', true)
          .orWhere('white_sheets.discussing_agreement_complete', '=', 1)
      })
      .where('company_id', companyId)
      .count()
      .first();
    return count > 0;
  }

  async canUserAppropiateOver({appropiatorId, overriddenUserId}) {
    if (appropiatorId == overriddenUserId) return { canAppropiate: false, overriddeRoleId: null, appropiatorRoleId: null };
    const appropiatorRoleId = await this.getHighestRoleId(appropiatorId);
    const overriddeRoleId = await this.getHighestRoleId(overriddenUserId);
    const rolesThatCanAppropiateFeeAgreementCreation = [userRoles.Coach, userRoles.Operations, userRoles.RegionalDirector];
    if (!rolesThatCanAppropiateFeeAgreementCreation.includes(appropiatorRoleId)) {
      return { canAppropiate: false, overriddeRoleId, appropiatorRoleId };
    }
    const overridableRolesByRole = {
      [userRoles.Operations]: [userRoles.RegionalDirector, userRoles.Coach, userRoles.Recruiter],
      [userRoles.RegionalDirector]: [userRoles.Coach, userRoles.Recruiter],
      [userRoles.Coach]: [userRoles.Recruiter],
    };

    const targetColumnsPerRole = {
      [userRoles.RegionalDirector]: 'regional_director_id',
      [userRoles.Coach]: 'coach_id',
      [userRoles.Recruiter]: 'recruiter_id'
    };

    const overridableRoles = overridableRolesByRole[appropiatorRoleId];

    if (!overridableRoles.includes(overriddeRoleId)) return { canAppropiate: false, overriddeRoleId, appropiatorRoleId };

    if (appropiatorRoleId == userRoles.Operations) {
      return { canAppropiate: true, overriddeRoleId, appropiatorRoleId };
    }


    const appropiatorRoleTargetColumn = targetColumnsPerRole[appropiatorRoleId];
    const overriddenRoleTargetColumn = targetColumnsPerRole[overriddeRoleId];
    
    const { count } = await Database.table('recruiter_has_industries')
        .select(Database.raw('count(*) as count'))
        .where(overriddenRoleTargetColumn, overriddenUserId)
        .where(appropiatorRoleTargetColumn, appropiatorId)
        .first();
    return { canAppropiate: count > 0, overriddeRoleId, appropiatorRoleId };    
  }

  /**
   * Creates a CompanyFeeAgreement
   *
   * @param {Object} data
   * @param {Company} company
   * @param {HiringAuthority} hiringAuthority
   * @param {Transaction} externalTransaction
   * 
   * @return {Object} CompanyFeeAgreement
   */

  async create(data, company, hiringAuthority,  inputUserId, externalTransaction) {
    const transaction = externalTransaction ? externalTransaction : await Database.beginTransaction();
    const isAtomic = transaction && (!externalTransaction);
    try {
      const  { job_orders } = data;
      const { overridden_user_id } = data;
      const  { canAppropiate, appropiatorRoleId } = overridden_user_id ? await this.canUserAppropiateOver({appropiatorId: inputUserId, overriddenUserId: overridden_user_id}) : {};
      const isValidOverridenCreation = overridden_user_id && canAppropiate;
      if (overridden_user_id && !isValidOverridenCreation) {
        isAtomic && (await transaction.rollback());
        return {
          code: 403,
          message: Antl.formatMessage('feeAgreement.restriction.userCantAppropiate'),
          success: false
        };
      }
      
      const userId = isValidOverridenCreation ? overridden_user_id : inputUserId;
      const feeAgreementData =  {
        ...this.unWrapFeeAgreementDataForCreation(data),
        signature_process_type_id: FeeAgreementSignatureProcessType.FortPacManaged,
        appropiator_id: inputUserId,
        appropiator_role_id: appropiatorRoleId,
        creator_id: userId
      };
      const highestRole = await this.getHighestRoleId(userId);
      const rolesThatCanCreateFeeAgrements = [userRoles.Coach, userRoles.Recruiter, userRoles.RegionalDirector];
      if (!rolesThatCanCreateFeeAgrements.includes(highestRole)) {
        isAtomic && (await transaction.rollback());
        return {
          code: 403,
          message: Antl.formatMessage('feeAgreement.restriction.onlyCoachRecruiterorRegionalCanCreate'),
          success: false
        };
      }
      if (!(await this.companyHasJobOrdersToSign(company.id))) {
        isAtomic && (await transaction.rollback());
        return {
          code: 400,
          success: false,
          message: Antl.formatMessage('feeAgreement.restriction.companyHasNotJobOrders'),
        };
      }
      let result;
      switch (feeAgreementData.fee_agreement_payment_scheme_id) {
        case FeeAgreementPaymentSchemes.Standard: 
          result = await this.createWithStandardPaymentScheme({feeAgreementData, userId, highestRole, company, hiringAuthority, externalTransaction});
          break;
        case FeeAgreementPaymentSchemes.Flat: 
          result = await this.createWithFlatPaymentScheme({feeAgreementData, userId, highestRole, company, hiringAuthority, externalTransaction});
          break;
        case FeeAgreementPaymentSchemes.Conversion: 
          result = await this.createWithConversionPaymentScheme({feeAgreementData, userId, highestRole, company, hiringAuthority, externalTransaction});
          break;
        case FeeAgreementPaymentSchemes.BaseSalary: 
          result = await this.createWithBaseSalaryPaymentScheme({feeAgreementData, userId, highestRole, company, hiringAuthority, externalTransaction});
          break;
        default: 
          isAtomic && (await transaction.rollback());
          return {
            code: 400,
            message: Antl.formatMessage('feeAgreement.restriction.badPaymentScheme'),
            success: false
          };
      }
      const feeAgreement = result.data;
      if (feeAgreement && Array.isArray(job_orders)) {
        await this.associateToWhiteSheets(feeAgreement.id, company.id, job_orders, transaction);
      }
      isAtomic && (await transaction.commit());
      return result;
    } catch (error) {
      isAtomic && (await transaction.rollback());
      throw error;
    }
  }

  async getFinalPayloadForStandard({feeAgreementData, company, hiringAuthority, fee_agreement_status_id}) {
    const config = await ModulePresetsConfigRepository.getById('feeAgreement');
    const feeAgreementDefaults  = config.data.defaultValues;
    const {regional_director_id, coach_id, success} = await UserRepository.getCoachAndRegionalDirector(feeAgreementData.creator_id);
    if (!success) {
      throw {
        code: 403,
        message: Antl.formatMessage('feeAgreement.restriction.onlyCoachRecruiterorRegionalCanCreate'),
        success: false
      };
    }
    if (feeAgreementData.fee_percentage < feeAgreementDefaults.minimum_fee_percentage) {
      throw {
        code: 400,
        message: Antl.formatMessage('feeAgreement.restriction.feeAgreementPercentageMinimum', {percentage:  feeAgreementDefaults.minimum_fee_percentage}),
        success: false
      };
    }
    const result = {
      ...feeAgreementData,
      flat_fee_amount: null,
      fee_percentage: (!feeAgreementData.fee_percentage_change_requested) ? feeAgreementDefaults.fee_percentage : feeAgreementData.fee_percentage,
      guarantee_days: (!feeAgreementData.guarantee_days_change_requested) ? feeAgreementDefaults.guarantee_days : feeAgreementData.guarantee_days,
      verbiage_changes: (!feeAgreementData.verbiage_changes_requested) ? feeAgreementDefaults.verbiage_changes : feeAgreementData.verbiage_changes,
      coach_id: coach_id,
      regional_director_id,
      company_id: company.id,
      hiring_authority_id: hiringAuthority.id,
      fee_agreement_status_id: fee_agreement_status_id,
      production_director_signer_id: feeAgreementDefaults.production_director_id
    };
    result.current_responsible = await this.getCurrentResponsible(fee_agreement_status_id, result);
    return result;
  }

  async getCorrespondingTemplateId(feeAgreementData) {
    const config = await ModulePresetsConfigRepository.getById('feeAgreement');
    const feeAgreementDefaults  = config.data.defaultValues;
    if (feeAgreementData.fee_agreement_payment_scheme_id === FeeAgreementPaymentSchemes.Flat) {
      if (feeAgreementData.guarantee_days) {
        return feeAgreementDefaults.template_ids.flat_with_guarantee;
      } else {
        return feeAgreementDefaults.template_ids.flat_without_guarantee
      }
    } else if (
        feeAgreementData.fee_agreement_payment_scheme_id === FeeAgreementPaymentSchemes.Standard || 
        feeAgreementData.fee_agreement_payment_scheme_id === FeeAgreementPaymentSchemes.Conversion||
        feeAgreementData.fee_agreement_payment_scheme_id === FeeAgreementPaymentSchemes.BaseSalary) {
      return feeAgreementDefaults.template_ids[feeAgreementData.fee_agreement_payment_scheme_id];
    }
    return feeAgreementDefaults.template_ids[FeeAgreementPaymentSchemes.Standard];
  }

  getCreationBasicEventPayload({companyFeeAgreement, event_type_id}) {
    return {
      fee_agreement_id: companyFeeAgreement.id,
      event_type_id,
      triggered_by_user_id: companyFeeAgreement.creator_id,
      result_fee_agreement_status_id: companyFeeAgreement.fee_agreement_status_id,
      event_details: this.unWrapValidableFields(companyFeeAgreement)
    };
  }
  
  async createWithStandardPaymentScheme({feeAgreementData, company, hiringAuthority, highestRole, userId, externalTransaction}) {
    let transaction;
    try {
      transaction = externalTransaction ? externalTransaction : await Database.beginTransaction();
      const { fee_agreement_status_id, event_type_id } = await this.feeAgreementStatusCalculator.calculateInitialStatusAndInitialEventForStandard(feeAgreementData, highestRole);
      const finalFeeAgreementPayload = await this.getFinalPayloadForStandard({feeAgreementData, hiringAuthority, company,  fee_agreement_status_id});
      const companyFeeAgreement = await CompanyFeeAgreement.create(finalFeeAgreementPayload, transaction);
      const eventData = this.getCreationBasicEventPayload({companyFeeAgreement, company, event_type_id});
      if (event_type_id === FeeAgreementEventType.CreatedAndSentToSign) {
        const { providerId, contractSentDetails} = await this.sendToSign(companyFeeAgreement, userId, transaction);
        eventData.event_details = {
          signature_provider_id: providerId,
          contract_sent_details: contractSentDetails,
          ...eventData.event_details
        };
        await companyFeeAgreement.save(transaction);
      }
      await FeeAgreementEventLog.create(eventData, transaction);
      if (!externalTransaction) {
        await transaction.commit();
      }
      if (event_type_id === FeeAgreementEventType.CreatedAndSentToSign) {
        Event.fire(EventType.CompanyFeeAgreement.CreatedAndSentToSign, {feeAgreement: companyFeeAgreement});
      } else {
        if (highestRole === userRoles.Coach || highestRole === userRoles.RegionalDirector) {
          Event.fire(EventType.CompanyFeeAgreement.CreatedAndSentToOperationsValidation, {feeAgreement: companyFeeAgreement});
        } else {
          Event.fire(EventType.CompanyFeeAgreement.CreatedAndSentToCoachValidation, {feeAgreement: companyFeeAgreement});
        }
      }
      return { success: true, code: 200, data:companyFeeAgreement };
    } catch(error) {
      if (!externalTransaction && transaction) {
        await transaction.rollback();
      }
      appInsights.defaultClient.trackException({exception: error});
      throw error;
    }
  }

  async getFinalPayloadForFlat({feeAgreementData, company, hiringAuthority, fee_agreement_status_id}) {
    const config = await ModulePresetsConfigRepository.getById('feeAgreement');
    const feeAgreementDefaults  = config.data.defaultValues;
    const {regional_director_id, coach_id, success} = await UserRepository.getCoachAndRegionalDirector(feeAgreementData.creator_id);
    if (!success) {
      throw {
        code: 403,
        message: Antl.formatMessage('feeAgreement.restriction.onlyCoachRecruiterorRegionalCanCreate'),
        success: false
      };
    }
    if (typeof feeAgreementData.flat_fee_amount !== 'number' || feeAgreementData.flat_fee_amount < 0) {
      throw {
        code: 400,
        message: Antl.formatMessage('feeAgreement.restriction.feeAmountMandatory'),
        success: false
      };
    }

    const result = {
      ...feeAgreementData,
      fee_percentage: null,
      guarantee_days: (!feeAgreementData.guarantee_days_change_requested) ? feeAgreementDefaults.guarantee_days : feeAgreementData.guarantee_days,
      verbiage_changes: (!feeAgreementData.verbiage_changes_requested) ? feeAgreementDefaults.verbiage_changes : feeAgreementData.verbiage_changes,
      coach_id: coach_id,
      company_id: company.id,
      hiring_authority_id: hiringAuthority.id,
      fee_agreement_status_id: fee_agreement_status_id,
      production_director_signer_id: feeAgreementDefaults.production_director_id,
      regional_director_id
    };
    result.current_responsible = await this.getCurrentResponsible(fee_agreement_status_id, result);
    return result;
  }

  async createWithFlatPaymentScheme({userId, feeAgreementData, hiringAuthority, company, highestRole, externalTransaction}) {
    let transaction;
    try {
      transaction = externalTransaction ? externalTransaction : await Database.beginTransaction();
      const { fee_agreement_status_id, event_type_id } = await this.feeAgreementStatusCalculator.calculateInitialStatusAndInitialEventForFlat(feeAgreementData, highestRole);
      const finalFeeAgreementPayload = await this.getFinalPayloadForFlat({feeAgreementData, hiringAuthority, company,  fee_agreement_status_id});
      const companyFeeAgreement = await CompanyFeeAgreement.create(finalFeeAgreementPayload, transaction);
      const eventData = this.getCreationBasicEventPayload({companyFeeAgreement, company, event_type_id});
      let eventToFire = null;
      const context = {feeAgreement: companyFeeAgreement};
      if (companyFeeAgreement.fee_agreement_status_id == FeeAgreementStatus.PendingHiringAuthoritySignature) {
        const { providerId, contractSentDetails } = await this.sendToSign(companyFeeAgreement, userId, transaction);
        eventData.event_details = {
          signature_provider_id: providerId,
          contract_sent_details: contractSentDetails,
          ...eventData.event_details
        };
        eventToFire = EventType.CompanyFeeAgreement.CreatedAndSentToSign;
      } else if (highestRole === userRoles.Coach) {
        eventToFire = EventType.CompanyFeeAgreement.CreatedAndSentToOperationsValidation;
      } else {
        eventToFire = EventType.CompanyFeeAgreement.CreatedAndSentToCoachValidation;
      }
      await FeeAgreementEventLog.create(eventData, transaction);
      if (!externalTransaction) {
        await transaction.commit();
      }
      Event.fire(eventToFire, context);
      return { success: true, code: 200, data:companyFeeAgreement };
    } catch(error) {
      if (!externalTransaction && transaction) {
        await transaction.rollback();
      }
      appInsights.defaultClient.trackException({exception: error});
      throw error;
    }
  }

  async getFinalPayloadForConversion({feeAgreementData, company, hiringAuthority, fee_agreement_status_id}) {
    const config = await ModulePresetsConfigRepository.getById('feeAgreement');
    const feeAgreementDefaults  = config.data.defaultValues;
    const {coach_id, regional_director_id, success} = await UserRepository.getCoachAndRegionalDirector(feeAgreementData.creator_id);
    if (!success) {
      throw {
        code: 403,
        message: Antl.formatMessage('feeAgreement.restriction.onlyCoachRecruiterorRegionalCanCreate'),
        success: false
      };
    }
    const result = {
      ...feeAgreementData,
      flat_fee_amount: null,
      fee_percentage: (!feeAgreementData.fee_percentage_change_requested) ? feeAgreementDefaults.fee_percentage : feeAgreementData.fee_percentage,
      guarantee_days: null,
      verbiage_changes: (!feeAgreementData.verbiage_changes_requested) ? feeAgreementDefaults.verbiage_changes : feeAgreementData.verbiage_changes,
      coach_id: coach_id,
      company_id: company.id,
      hiring_authority_id: hiringAuthority.id,
      regional_director_id,
      fee_agreement_status_id: fee_agreement_status_id,
      production_director_signer_id: feeAgreementDefaults.production_director_id
    };
    result.current_responsible = await this.getCurrentResponsible(fee_agreement_status_id, result);
    return result;
  }

  async createWithConversionPaymentScheme({feeAgreementData, userId, highestRole, company, hiringAuthority, externalTransaction}) {
    let transaction;
    try {
      transaction = externalTransaction ? externalTransaction : await Database.beginTransaction();
      const { fee_agreement_status_id, event_type_id } = await this.feeAgreementStatusCalculator.calculateInitialStatusAndInitialEventForConversion(feeAgreementData, highestRole);
      const finalFeeAgreementPayload = await this.getFinalPayloadForConversion({feeAgreementData, hiringAuthority, company,  fee_agreement_status_id});
      const companyFeeAgreement = await CompanyFeeAgreement.create(finalFeeAgreementPayload, transaction);
      const eventData = this.getCreationBasicEventPayload({companyFeeAgreement, company, event_type_id});
      if (event_type_id === FeeAgreementEventType.CreatedAndSentToSign) {
        const {contractSentDetails} = await this.sendToSign(companyFeeAgreement, userId, transaction);
        eventData.event_details = {
          contract_sent_details: contractSentDetails,
          ...eventData.event_details
        };
        await companyFeeAgreement.save(transaction);
      }
      await FeeAgreementEventLog.create(eventData, transaction);
      if (!externalTransaction) {
        transaction.commit();
      }
      if (event_type_id === FeeAgreementEventType.CreatedAndSentToSign) {
        Event.fire(EventType.CompanyFeeAgreement.CreatedAndSentToSign, {feeAgreement: companyFeeAgreement});
      } else {
        if (highestRole === userRoles.Coach) {
          Event.fire(EventType.CompanyFeeAgreement.CreatedAndSentToOperationsValidation, {feeAgreement: companyFeeAgreement});
        } else {
          Event.fire(EventType.CompanyFeeAgreement.CreatedAndSentToCoachValidation, {feeAgreement: companyFeeAgreement});
        }
      }
      return { success: true, code: 200, data:companyFeeAgreement };
    } catch(error) {
      if (!externalTransaction && transaction) {
        await transaction.rollback();
      }
      appInsights.defaultClient.trackException({exception: error});
      return {
        success: false,
        code: 500,
        message: Antl.formatMessage('feeAgreement.error.creation')
      };
    }
  }

  async getFinalPayloadForBaseSalary({feeAgreementData, company, hiringAuthority, fee_agreement_status_id}) {
    const config = await ModulePresetsConfigRepository.getById('feeAgreement');
    const feeAgreementDefaults  = config.data.defaultValues;
    const {regional_director_id, coach_id, success} = await UserRepository.getCoachAndRegionalDirector(feeAgreementData.creator_id);
    if (!success) {
      throw {
        code: 403,
        message: Antl.formatMessage('feeAgreement.restriction.onlyCoachRecruiterorRegionalCanCreate'),
        success: false
      };
    }
    if (feeAgreementData.fee_percentage < feeAgreementDefaults.minimum_fee_percentage) {
      throw {
        code: 400,
        message:  Antl.formatMessage('feeAgreement.restriction.feeAgreementPercentageMinimum', {percentage: feeAgreementDefaults.minimum_fee_percentage}),
        success: false
      };
    }
    const result = {
      ...feeAgreementData,
      flat_fee_amount: null,
      fee_percentage: (!feeAgreementData.fee_percentage_change_requested) ? feeAgreementDefaults.fee_percentage : feeAgreementData.fee_percentage,
      guarantee_days: (!feeAgreementData.guarantee_days_change_requested) ? feeAgreementDefaults.guarantee_days : feeAgreementData.guarantee_days,
      verbiage_changes: (!feeAgreementData.verbiage_changes_requested) ? feeAgreementDefaults.verbiage_changes : feeAgreementData.verbiage_changes,
      coach_id: coach_id,
      regional_director_id,
      company_id: company.id,
      hiring_authority_id: hiringAuthority.id,
      fee_agreement_status_id: fee_agreement_status_id,
      production_director_signer_id: feeAgreementDefaults.production_director_id
    };
    result.current_responsible = await this.getCurrentResponsible(fee_agreement_status_id, result);
    return result;
  }

  async createWithBaseSalaryPaymentScheme({feeAgreementData, userId, highestRole, company, hiringAuthority, externalTransaction}) {
    let transaction;
    try {
      transaction = externalTransaction ? externalTransaction : await Database.beginTransaction();
      const { fee_agreement_status_id, event_type_id } = await this.feeAgreementStatusCalculator.calculateInitialStatusAndInitialEventForBaseSalary(feeAgreementData, highestRole);
      const finalFeeAgreementPayload = await this.getFinalPayloadForBaseSalary({feeAgreementData, hiringAuthority, company,  fee_agreement_status_id});
      const companyFeeAgreement = await CompanyFeeAgreement.create(finalFeeAgreementPayload, transaction);
      const eventData = this.getCreationBasicEventPayload({companyFeeAgreement, company, event_type_id});
      if (event_type_id === FeeAgreementEventType.CreatedAndSentToSign) {
        const { contractSentDetails } = await this.sendToSign(companyFeeAgreement, userId, transaction);
        eventData.event_details = {
          contract_sent_details: contractSentDetails,
          ...eventData.event_details
        };
        await companyFeeAgreement.save(transaction);
      }
      await FeeAgreementEventLog.create(eventData, transaction);
      if (!externalTransaction) {
        transaction.commit();
      }
      if (event_type_id === FeeAgreementEventType.CreatedAndSentToSign) {
        Event.fire(EventType.CompanyFeeAgreement.CreatedAndSentToSign, {feeAgreement: companyFeeAgreement});
      } else {
        if (highestRole === userRoles.Coach) {
          Event.fire(EventType.CompanyFeeAgreement.CreatedAndSentToOperationsValidation, {feeAgreement: companyFeeAgreement});
        } else {
          Event.fire(EventType.CompanyFeeAgreement.CreatedAndSentToCoachValidation, {feeAgreement: companyFeeAgreement});
        }
      }
      return { success: true, code: 200, data:companyFeeAgreement };
    } catch(error) {
      if (!externalTransaction && transaction) {
        await transaction.rollback();
      }
      appInsights.defaultClient.trackException({exception: error});
      return {
        success: false,
        code: 500,
        message: Antl.formatMessage('feeAgreement.error.creation')
      };
    }
  }

  /**
   * Allows Coach to validate a PendingCoachValidation Fee Agreement
   *
   * @param {Number} id
   * @param {Number} userId
   * @param {Transaction} externalTransaction
   * 
   * @return {Object} CompanyFeeAgreement
   */
  async coachValidation(id, userId, externalTransaction) {
    let transaction;
    try {
      const rolesEventMap = {
        [userRoles.RegionalDirector]: FeeAgreementEventType.ValidatedByRegionalDirector,
        [userRoles.Coach]: FeeAgreementEventType.ValidatedByCoach,
      };
      const highestRole = await this.getHighestRoleId(userId);
      if (highestRole == userRoles.Operations) {
        return await this.operationsValidation(id, userId, externalTransaction);
      }
      const currentEventId = rolesEventMap[highestRole];
      if (!currentEventId) {
        return {
          success: false,
          code : 403,
          message: Antl.formatMessage('feeAgreement.restriction.onlyCoachRegionalOperationsCanValidate')
        };
      }
      const feeAgreement = await CompanyFeeAgreement.find(id);
      if (!feeAgreement) {
        return {
          success: false,
          code : 404,
          message: Antl.formatMessage('feeAgreement.error.notFound')
        };
      }
      if (currentEventId == FeeAgreementEventType.ValidatedByCoach && feeAgreement.coach_id != userId) {
        return {
          success: false,
          code : 403,
          message: Antl.formatMessage('feeAgreement.restriction.onlyAssignedUsersCanCancelValidationRequest')
        };
      }
      transaction = externalTransaction ? externalTransaction : await Database.beginTransaction();
      const fee_agreement_status_id = await this.calculateStatus(feeAgreement.fee_agreement_status_id, currentEventId, {feeAgreement});
      const dataToClear = this.clearDataForCoachValidation();
      const feeAgrement = {
        fee_agreement_status_id,
        current_responsible: await this.getCurrentResponsible(fee_agreement_status_id, feeAgreement),
        ...dataToClear
      };
      feeAgreement.merge(feeAgrement);
      const eventData = {
        fee_agreement_id: feeAgreement.id,
        triggered_by_user_id: userId,
        result_fee_agreement_status_id: fee_agreement_status_id,
        event_details: this.unWrapValidableFields(feeAgreement),
        event_type_id: currentEventId,
      };
      if (fee_agreement_status_id === FeeAgreementStatus.PendingHiringAuthoritySignature) {
        await Company.find(feeAgreement.company_id);
        await HiringAuthority.find(feeAgreement.hiring_authority_id);
        const { contractSentDetails} = await this.sendToSign(feeAgreement, userId, transaction);
        eventData.event_details = {
          fee_agreement: this.unWrapValidableFields(feeAgreement),
          contract_sent_details: contractSentDetails
        };
        eventData.event_type_id =
          (currentEventId == FeeAgreementEventType.ValidatedByRegionalDirector) ?
          FeeAgreementEventType.ValidatedByRegionalDirectorAndSentToSign :
          FeeAgreementEventType.ValidatedByCoachAndSentToSign;
      }
      await feeAgreement.save(transaction);
      await FeeAgreementEventLog.create(eventData, transaction);
      if (!externalTransaction) {
        await transaction.commit();
      }
      await this.loadRelations(feeAgreement);
      if (feeAgreement.fee_agreement_status_id == FeeAgreementStatus.PendingHiringAuthoritySignature) {
        Event.fire(EventType.CompanyFeeAgreement.ValidatedByCoachAndSentToSign, {feeAgreement});
      } else {
        Event.fire(EventType.CompanyFeeAgreement.ValidatedByCoach, {feeAgreement});
      }
      return { success: true, code: 200, data: feeAgreement };
    } catch(error) {
      if (!externalTransaction && transaction) {
        transaction.rollback();
      }
      appInsights.defaultClient.trackException({exception: error});
      return {
        success: false,
        code: 500,
        message: Antl.formatMessage('feeAgreement.error.validation')
      };
    }    
  }

  /**
   * Allows Coach to declinate a PendingCoachValidation Fee Agreement
   *
   * @param {Number} id
   * @param {Number} userId
   * @param {Object} inputDeclinationDetails
   * @param {Transaction} externalTransaction
   * 
   * @return {Object} CompanyFeeAgreement
   */
  async coachDeclination(id, userId, inputDeclinationDetails, externalTransaction) {
    let transaction;
    try {
      const feeAgreement = await CompanyFeeAgreement.find(id);
      if (!feeAgreement) {
        throw {
          success: false,
          code : 404,
          message: Antl.formatMessage('feeAgreement.error.notFound')
        };
      }
      
      const declinationDetails = this.unWrapDeclinationDetails(inputDeclinationDetails);
      const rolesEventMap = {
        [userRoles.Coach]: FeeAgreementEventType.DeclinedByCoach,
        [userRoles.RegionalDirector]: FeeAgreementEventType.DeclinedByRegionalDirector,
      };
      const highestRole = await this.getHighestRoleId(userId);
      if (highestRole == userRoles.Operations) {
        return await this.operationsDeclination(id, userId, inputDeclinationDetails, externalTransaction);
      }
      const currentEventId = rolesEventMap[highestRole];
      if (!currentEventId) {
        throw {
          success: false,
          code : 403,
          message: Antl.formatMessage('feeAgreement.restriction.notValidRoleForCoachDeclination')
        };
      }
      const declinationDetailsValidationResult = this.validateDeclinationDetails(declinationDetails, feeAgreement);
      if (!declinationDetailsValidationResult.valid) {
        return {
          success: false,
          code : 400,
          message: declinationDetailsValidationResult.message
        };
      }
      if (currentEventId == FeeAgreementEventType.DeclinedByCoach && feeAgreement.coach_id != userId) {
        throw {
          success: false,
          code : 403,
          message: Antl.formatMessage('feeAgreement.restriction.notCoachAssignedToAgreement')
        };
      }
      transaction = externalTransaction ? externalTransaction : await Database.beginTransaction();
      const fee_agreement_status_id = await this.calculateStatus(feeAgreement.fee_agreement_status_id, currentEventId, {feeAgreement});
      
      feeAgreement.merge({
        current_declinator_id: userId,
        fee_agreement_status_id,
        declination_details: declinationDetails,
        current_responsible: await this.getCurrentResponsible(fee_agreement_status_id, feeAgreement),
      });
      const eventData = {
        fee_agreement_id: feeAgreement.id,
        triggered_by_user_id: userId,
        result_fee_agreement_status_id: fee_agreement_status_id,
        event_details: declinationDetails,
        event_type_id: currentEventId,
      };
      await feeAgreement.save(transaction);
      await FeeAgreementEventLog.create(eventData, transaction);
      if (!externalTransaction) {
        await transaction.commit();
      }
      await this.loadRelations(feeAgreement);
      Event.fire(EventType.CompanyFeeAgreement.DeclinedByCoach, {feeAgreement});
      return { success: true, code: 200, data: feeAgreement };
    } catch(error) {
      if (!externalTransaction && transaction) {
        await transaction.rollback();
      }
      throw error;
    }    
  }
  /**
   * Allows Recruiter to send a DeclinedByCoach Fee Agreement to revalidate with Coach
   *
   * @param {Number} id
   * @param {Number} userId
   * @param {Object} declinedFieldValues
   * @param {Transaction} externalTransaction
   * 
   * @return {Object} CompanyFeeAgreement
   */
  async sendToCoachValidation(id, userId, declinedFieldValues, externalTransaction) {
    let transaction;
    try {
      const currentEventId = FeeAgreementEventType.SentToCoachValidation;
      const feeAgreement = await CompanyFeeAgreement.find(id);
      if (!feeAgreement) {
        return {
          success: false,
          code : 404,
          message: 'Fee Agremeent not found'
        };
      }
      if (feeAgreement.creator_id != userId) {
        return {
          success: false,
          code : 403,
          message: 'Only the creator can perform this operation'
        };
      }
      transaction = externalTransaction ? externalTransaction : await Database.beginTransaction();
      const fee_agreement_status_id = await this.calculateStatus(feeAgreement.fee_agreement_status_id, currentEventId, {feeAgreement});
      const declinedFields = feeAgreement.declination_details ? feeAgreement.declination_details.declined_fields : null;
      const changedFields = this.unWrapDeclinedFields(declinedFieldValues, declinedFields || StandardFeeAgreementDeclinableField);
      feeAgreement.merge({
        declination_details: null,
        fee_agreement_status_id,
        current_responsible: await this.getCurrentResponsible(fee_agreement_status_id, feeAgreement),
        ...changedFields
      });
      const eventData = {
        fee_agreement_id: feeAgreement.id,
        triggered_by_user_id: userId,
        result_fee_agreement_status_id: fee_agreement_status_id,
        event_details: changedFields,
        event_type_id: currentEventId,
      };
      await feeAgreement.save(transaction);
      await FeeAgreementEventLog.create(eventData, transaction);
      if (!externalTransaction) {
        await transaction.commit();
      }
      await this.loadRelations(feeAgreement);
      Event.fire(EventType.CompanyFeeAgreement.SentToCoachValidation, {feeAgreement});
      return { success: true, code: 200, data: feeAgreement };
    } catch(error) {
      if (!externalTransaction && transaction) {
        await transaction.rollback();
      }
      appInsights.defaultClient.trackException({exception: error});
      return {
        success: false,
        code: 500,
        message: Antl.formatMessage('feeAgreement.error.revalidation')
      };
    }    
  }

  async operationsValidation(id, userId, externalTransaction) {
    let transaction;
    try {
      const isOperations = await UserRepository.hasRole(userId, userRoles.Operations);
      if (!isOperations) {
        throw new ForbiddenException(Antl.formatMessage('feeAgreement.restriction.onlyOperationsTeamCanPerformOperationsValidation'));
      }
      const feeAgreement = await CompanyFeeAgreement.find(id);
      if (!feeAgreement) {
        return {
          success: false,
          code : 404,
          message: Antl.formatMessage('feeAgreement.error.notFound')
        };
      }
      if (feeAgreement.verbiage_changes_requested) {
        return {
          success: false,
          code : 400,
          message: Antl.formatMessage('feeAgreement.restriction.verbiageValidation')
        };
      }
      const currentEventId = FeeAgreementEventType.ValidatedByOperationsAndSentToSign;
      const fee_agreement_status_id = await this.calculateStatus(feeAgreement.fee_agreement_status_id, currentEventId, {feeAgreement});
      const feeAgreementDataToMerge = this.clearDataForOperationsValidation({
        fee_agreement_status_id,
        current_responsible: await this.getCurrentResponsible(fee_agreement_status_id, feeAgreement),
        validated_date: fee_agreement_status_id === FeeAgreementEventType.ProductionDirectorValidates ? new Date() : null
      });
      feeAgreement.merge(feeAgreementDataToMerge);
      const eventData = {
        fee_agreement_id: feeAgreement.id,
        triggered_by_user_id: userId,
        result_fee_agreement_status_id: fee_agreement_status_id,
        event_type_id: currentEventId,
      };
      transaction = externalTransaction ? externalTransaction : await Database.beginTransaction();
      if (fee_agreement_status_id === FeeAgreementStatus.PendingHiringAuthoritySignature) {
        const {contractSentDetails} = await this.sendToSign(feeAgreement, userId, transaction);
        eventData.event_details = {
          fee_agreement: this.unWrapValidableFields(feeAgreement),
          contract_sent_details: contractSentDetails
        };
      }
      await feeAgreement.save(transaction);
      await FeeAgreementEventLog.create(eventData, transaction);
      if (!externalTransaction) {
        await transaction.commit();
      }
      await this.loadRelations(feeAgreement);
      Event.fire(EventType.CompanyFeeAgreement.ValidatedByOperationsAndSentToSign, {feeAgreement});
      
      return { success: true, code: 200, data: feeAgreement };
    } catch(error) {
      if (!externalTransaction && transaction) {
        await transaction.rollback();
      }
      appInsights.defaultClient.trackException({exception: error});
      return {
        success: false,
        code: 500,
        message: Antl.formatMessage('feeAgreement.error.revalidation')
      };
    }    
  }

  async operationsDeclination(id, userId, inputDeclinationDetails, externalTransaction) {
    let transaction;
    try {
      const isOperations = await UserRepository.hasRole(userId, userRoles.Operations);
      if (!isOperations) {
        throw  {
          code: 403,
          message: Antl.formatMessage('feeAgreement.restriction.onlyOperationsTeamCanPerformOperationsDeclination'),
          success: false
        };
      }
      const feeAgreement = await CompanyFeeAgreement.find(id);
      if (!feeAgreement) {
        throw {
          success: false,
          code : 404,
          message: Antl.formatMessage('feeAgreement.error.notFound')
        };
      }
      const declinationDetails = this.unWrapDeclinationDetails(inputDeclinationDetails);
      const currentEventId = FeeAgreementEventType.DeclinedByOperations;
      const declinationDetailsValidationResult = this.validateDeclinationDetails(declinationDetails, feeAgreement);
      if (!declinationDetailsValidationResult.valid) {
        throw {
          success: false,
          code : 400,
          message: declinationDetailsValidationResult.message
        };
      }
      const fee_agreement_status_id = await this.calculateStatus(feeAgreement.fee_agreement_status_id, currentEventId, {feeAgreement});
      
      feeAgreement.merge({
        current_declinator_id: userId,
        fee_agreement_status_id,
        declination_details: declinationDetails,
        current_responsible: await this.getCurrentResponsible(fee_agreement_status_id, feeAgreement),
      });
      const eventData = {
        fee_agreement_id: feeAgreement.id,
        triggered_by_user_id: userId,
        result_fee_agreement_status_id: fee_agreement_status_id,
        event_details: declinationDetails,
        event_type_id: currentEventId,
      };
      transaction = externalTransaction ? externalTransaction : await Database.beginTransaction();
      await feeAgreement.save(transaction);
      await FeeAgreementEventLog.create(eventData, transaction);
      if (!externalTransaction) {
        await transaction.commit();
      }
      await this.loadRelations(feeAgreement);
      Event.fire(EventType.CompanyFeeAgreement.DeclinedByOperations, {feeAgreement});
      return { success: true, code: 200, data: feeAgreement };
    } catch(error) {
      if (!externalTransaction && transaction) {
        await transaction.rollback();
      }
      throw error;
    }    
  }

  async sendToOperationsValidation(id, userId, declinedFieldValues, externalTransaction) {
    let transaction;
    try {
      const currentEventId = FeeAgreementEventType.SentToOperationsValidation;
      const feeAgreement = await CompanyFeeAgreement.find(id);
      if (!feeAgreement) {
        return {
          success: false,
          message: Antl.formatMessage('feeAgreement.error.notFound'),
          code: 404
        }
      }
      if (feeAgreement.creator_id != userId) {
        return {
          success: false,
          message: Antl.formatMessage('feeAgreement.restriction.onlyCreatorCanPerformThisAction'),
          code: 403
        };
      }
      const fee_agreement_status_id = await this.calculateStatus(feeAgreement.fee_agreement_status_id, currentEventId, {feeAgreement});
      const declinedFields = feeAgreement.declination_details ? feeAgreement.declination_details.declined_fields : null;
      const changedFields = this.unWrapDeclinedFields(declinedFieldValues, declinedFields || StandardFeeAgreementDeclinableField);


      feeAgreement.merge({
        declination_details: null,
        fee_agreement_status_id,
        current_responsible: await this.getCurrentResponsible(fee_agreement_status_id, feeAgreement),
        ...changedFields
      });
      const eventData = {
        fee_agreement_id: feeAgreement.id,
        triggered_by_user_id: userId,
        result_fee_agreement_status_id: fee_agreement_status_id,
        event_type_id: currentEventId,
        event_details: {
          feeAgreement: {
            ...changedFields
          }
        }
      };
      transaction = externalTransaction ? externalTransaction : await Database.beginTransaction();
      await feeAgreement.save(transaction);
      await FeeAgreementEventLog.create(eventData, transaction);
      if (!externalTransaction) {
        await transaction.commit();
      }
      await this.loadRelations(feeAgreement);
      Event.fire(EventType.CompanyFeeAgreement.SentToOperationsValidation, {feeAgreement});
      return { success: true, code: 200, data: feeAgreement };
    } catch(error) {
      if (!externalTransaction && transaction) {
        await transaction.rollback();
      }
      appInsights.defaultClient.trackException({exception: error});
      return {
        success: false,
        code: 500,
        message: Antl.formatMessage('feeAgreement.error.revalidation')
      };
    }    
  }

  async createSignatureRequestPreview(id, templateId, subject, userId, externalTransaction) {
    let transaction;
    try {
      const currentEvent = FeeAgreementEventType.SignatureRequestPreviewCreated;
      const isOperations = await UserRepository.hasRole(userId, userRoles.Operations);
      if (!isOperations) {
        throw new ForbiddenException(Antl.formatMessage('feeAgreement.restriction.onlyOperationsTeamCanCreateSignatureRequestPreviews'));
      }
      const feeAgreement = await CompanyFeeAgreement.find(id);
      if (!feeAgreement) {
        return {
          success: false,
          code : 404,
          message: Antl.formatMessage('feeAgreement.error.notFound')
        };
      }

      const templateDetails = await promiseRetry(
        (retry, attempt) => {
          return helloSignProvider.getTemplateDetails(templateId).catch(retry);
        },
        { retries: 5 }
      ).then((templateResponse) => templateResponse);

      if (!templateDetails) {
        return {
          code: 404,
          message: Antl.formatMessage('feeAgreement.error.notFound')
        }
      }

      const customFieldsThatApply = templateDetails.template.custom_fields.map(({name}) => name);
      const company = await Company.find(feeAgreement.company_id);
      const productionDirector = await feeAgreement.productionDirector().with('personalInformation').fetch();
      const hiringAuthority = await HiringAuthority.find(feeAgreement.hiring_authority_id);
      feeAgreement.template_id = templateId;
      if (subject) {
        feeAgreement.subject = subject;
      }
      const response = await this.createSignatureRequestDraftWithTemplate({feeAgreement, company, hiringAuthority: hiringAuthority.toJSON(), productionDirector: productionDirector.toJSON(), userId, customFieldsThatApply});
      feeAgreement.contract_id = response.unclaimed_draft.signature_request_id;
      feeAgreement.fee_agreement_status_id = await this.calculateStatus(feeAgreement.fee_agreement_status_id, currentEvent, {feeAgreement});
      const eventData = {
        event_details:  {
          fee_agreement_event: feeAgreement.toJSON(),
          template_id: templateId
        },
        fee_agreement_id: feeAgreement.id,
        triggered_by_user_id: userId,
        result_fee_agreement_status_id: feeAgreement.fee_agreement_status_id,
        event_type_id: currentEvent,
      };
      transaction = externalTransaction ? externalTransaction : await Database.beginTransaction();
      await feeAgreement.save(transaction);
      await FeeAgreementEventLog.create(eventData, transaction);
      await transaction.commit();
      return { success: true, code: 200, data: response.unclaimed_draft };
    } catch(error) {
      if (!externalTransaction && transaction) {
        await transaction.rollback();
      }
      appInsights.defaultClient.trackException({exception: error});
      return {
        success: false,
        code: 500,
        message: Antl.formatMessage('feeAgreement.error.signatureRequestPreviewCreation')
      };
    }
  }

  async createSignatureRequestDraftWithTemplate({feeAgreement, company, hiringAuthority, productionDirector, userId, customFieldsThatApply}) {
    const config = await ModulePresetsConfigRepository.getById('feeAgreement');
    const { defaultPayload, defaultCCRole, unClaimedDraftPayload } = config.data.signatureRequest;
    const customFields = this.formatCustomFields({feeAgreement, hiringAuthority, feeAgreement, productionDirector, company});
    const currentCustomFields = Object.keys(customFields);
    currentCustomFields.forEach(field => {
      if (!customFieldsThatApply.includes(field)) {
        delete customFields[field];
      }
    })
    const cc_emails = await this.getFeeAgreementCCEmails(feeAgreement, defaultCCRole, userId);
    const requestPayload = {
      ...defaultPayload,
      subject: `${company.name} service agreement with gpac`,
      metadata: {feeAgreementId: feeAgreement.id, companyId: company.id, senderUserId: userId},
      template_id: feeAgreement.template_id,
      custom_fields: customFields,
      signers: await this.formatSigners(hiringAuthority, productionDirector),
      ccs: cc_emails,
      requester_email_address: unClaimedDraftPayload.requester_email_address
    };
    return await helloSignProvider.createSignatureRequestPreviewWithTemplate(requestPayload);
  }

  async resendThroughDocuSign(id, userId, externalTransaction) {
    const transaction = externalTransaction ? externalTransaction : await Database.beginTransaction();
    const isAtomic = transaction && !(externalTransaction);
    try {
      const { hasAtLeastOne: isOperationsUser } = await UserRepository.hasRoles(userId, [userRoles.Operations]);
      if (!isOperationsUser) {
        isAtomic && (await transaction.rollback());
        throw new ForbiddenException(Antl.formatMessage('feeAgreement.restriction.onlyOperationsTeamCanCreateSignatureRequestPreviews'));
      }
      const feeAgreement = await CompanyFeeAgreement.find(id);

      if (!feeAgreement) {
        isAtomic && (await transaction.rollback());
        throw new NotFoundException(Antl.formatMessage('feeAgreement.error.notFound'));
      }

      if (feeAgreement.fee_agreement_status_id != FeeAgreementStatus.PendingHiringAuthoritySignature) {
        isAtomic && (await transaction.rollback());
        throw {
          success: false,
          code: 400,
          message: Antl.formatMessage('feeAgreement.restriction.cantChangeSignatureProvider')
        };
      }

      if (feeAgreement.verbiage_changes_requested) {
        isAtomic && (await transaction.rollback());
        throw {
          success: false,
          code: 400,
          message: Antl.formatMessage('feeAgreement.restriction.cantSendWithVerbiageChangeThroughDocusign')
        };
      }

      if (feeAgreement.electronic_signature_provider_id === SignatureProvider.DocuSign) {
        isAtomic && (await transaction.rollback());
        throw {
          success: false,
          code: 400,
          message: Antl.formatMessage('feeAgreement.restriction.alreadyBackupService')
        };
      }
      await this.tryToCancelHelloSignFeeAgreementContract(feeAgreement);
      const feeAgreementContractManager =  await FeeAgreementContractManager.buildDefault();
      
      const  { contractSentDetails, providerId} = await feeAgreementContractManager.sendFeeAgreementThroughSpecificProvider({feeAgreement, userId, providerId: SignatureProvider.DocuSign});
      feeAgreement.electronic_signature_provider_id = providerId;
      const fillContractInformation = this.fillContractInformationMap[providerId];
      if (!(fillContractInformation instanceof Function)) throw new Error(`There is not implementation to extract contract information for '${providerId}' signature provider`);
      fillContractInformation(feeAgreement, contractSentDetails);
      await feeAgreement.save(transaction);
      await FeeAgreementEventLog.create({
        fee_agreement_id: feeAgreement.id,
        triggered_by_user_id: userId,
        result_fee_agreement_status_id: feeAgreement.fee_agreement_status_id,
        event_type_id: FeeAgreementEventType.ResentWithDocuSign,
        event_details: contractSentDetails,
        real_date: new Date()
      }, transaction);
      isAtomic && (await transaction.commit());
      await this.loadRelations(feeAgreement);
      return feeAgreement;
    } catch(error) {
      isAtomic && (await transaction.rollback());
      throw error;
    }
  }

  async tryToCancelHelloSignFeeAgreementContract(feeAgreement) {
    try {
      const feeAgreementContractManager =  FeeAgreementContractManager.buildDefault();
      const helloSignContractManager = feeAgreementContractManager.getManagerForSignatureProvider(SignatureProvider.HelloSign);
      await helloSignContractManager.voidContract(feeAgreement);
      return true;
    } catch(error) {
      return false;
    }
  }
  
  formatNumber(percentage) {
    const percentageInNumber = typeof percentage === 'number' ? percentage : Number(percentage);
    return percentageInNumber.toFixed(2);
  }

  formatPercentage(percentage) {
    const percentageInNumber = typeof percentage === 'number' ? percentage : Number(percentage);
    return `${percentageInNumber.toFixed(2)}%`;
  }

  formatMoney(number) {
    if (number === null || number === undefined) return '';
        return new Intl.NumberFormat('en', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 2
        }).format(number);
  }

  async getFeeAgreementGuaranteeDaysOptions() {
    const feeAgreementGuaranteeDaysOptions = await ModulePresetsConfigRepository.getById('feeAgreementGuaranteeDaysOptions');
    return feeAgreementGuaranteeDaysOptions.data;
  }

  async getFeeAgreementGuaranteeDaysOptionsByPaymentScheme() {
    const feeAgreementGuaranteeDaysOptionsPerPaymentScheme = await ModulePresetsConfigRepository.getById('feeAgreementGuaranteeDaysOptionsPerPaymentScheme');
    return feeAgreementGuaranteeDaysOptionsPerPaymentScheme.data;
  }

  async handleHelloSignEvent(event) {
    if (!helloSignProvider.verifyEvent(event.event)) {
      throw new Error('Hellosign event could not be verified');
    }
    const fee_agreement_id = this.tryExtractFeeAgreementId(event);
    const feeAgreement = fee_agreement_id ? await CompanyFeeAgreement.find(fee_agreement_id) : null;
    if (!feeAgreement) {
      return await this.storeHelloSignEvent(event);
    }
    const isSigned = (feeAgreement.fee_agreement_status_id == FeeAgreementStatus.Signed);
    const wasNotSentWithHelloSign = (!!feeAgreement.electronic_signature_provider_id && feeAgreement.electronic_signature_provider_id != SignatureProvider.HelloSign);
    if (isSigned || wasNotSentWithHelloSign) {
      return await this.storeHelloSignEvent(event);
    }
    const specificHandler = this.helloSignEventHandlers[event.event.event_type] || this.genericHelloSignEventHandler;
    return await specificHandler.bind(this)(event, feeAgreement);
  }

  async storeHelloSignEvent(event, externalTransaction) {
    const transaction = externalTransaction ? externalTransaction : await Database.beginTransaction();
    const isAtomic = !externalTransaction && transaction;
    try {
      const alreadyRegisteredEvent = await HelloSignEvent.find(event.event.event_hash);

      if (alreadyRegisteredEvent) {
        (!externalTransaction && transaction) && (await transaction.commit());
        return alreadyRegisteredEvent;
      }
      const helloSignEvent = {
        id: event.event.event_hash,
        fee_agreement_id: this.tryExtractFeeAgreementId(event),
        data: event,
        real_date: new Date(event.event.event_time * 1000)
      };
      const result =  await HelloSignEvent.create(helloSignEvent, transaction);
      isAtomic && (await transaction.commit());
      return result;
    } catch(error) {
      isAtomic && (await transaction.rollback());
      throw error;
    }
  }





  async genericHelloSignEventHandler(event, feeAgreement, externalTransaction) {

    const transaction = externalTransaction ? externalTransaction : await Database.beginTransaction();
    const isAtomic = !externalTransaction && transaction;
    try {
      const correspondingFeeAgreementEventType = await FeeAgreementEventTypeModel
        .query()
        .where('associated_hellosign_event_type', event.event.event_type)
        .first();
      const storedHelloSignEvent = await this.storeHelloSignEvent(event, transaction);

      if (!correspondingFeeAgreementEventType || !feeAgreement) {
        isAtomic && (await transaction.commit());
        return;
      }

      const eventData = {
        fee_agreement_id: feeAgreement.id,
        triggered_by_user_id: null,
        result_fee_agreement_status_id: feeAgreement.fee_agreement_status_id,
        event_type_id: correspondingFeeAgreementEventType.id,
        event_details: {},
        associated_hello_sign_event_id: storedHelloSignEvent.id,
        real_date: storedHelloSignEvent.real_date
      };


      await FeeAgreementEventLog.create(eventData, transaction);
      isAtomic && (await transaction.commit());
    } catch(error) {
      isAtomic && (await transaction.rollback());
      throw error;
    }
  }

  async handleDownloadableEvent(event, feeAgreement) {
    let transaction;
    try {
      transaction = await Database.beginTransaction();
      await this.genericHelloSignEventHandler(event, feeAgreement, transaction);
      if (!feeAgreement) {
        await transaction.rollback();
        return;
      }
      const path = `fee_agreements/fee_agreement_${feeAgreement.id}.pdf`;
      const fileStream =  await helloSignProvider.getFiles(feeAgreement.contract_id, {file_type: 'pdf'});
      feeAgreement.pdf_url = await uploadFile(path, fileStream);
      await feeAgreement.save(transaction);
      await transaction.commit();
      return feeAgreement;
    } catch(error) {
      await transaction.rollback();
      throw error;
    }
  }

  async updatePDFURL(feeAgreement, externalTransaction) {
    const transaction = externalTransaction ? externalTransaction : await Database.beginTransaction();
    const isAtomic  = transaction && !externalTransaction;
    try {
      const path = `fee_agreements/fee_agreement_${feeAgreement.id}.pdf`;
      const fileStream =  await helloSignProvider.getFiles(feeAgreement.contract_id, {file_type: 'pdf'});
      feeAgreement.pdf_url = await uploadFile(path, fileStream);
      await feeAgreement.save(transaction);
      isAtomic && (await transaction.commit());
    } catch(error) {
      isAtomic && (await transaction.rollback());
      throw error;
    }
  }

  

  async handleSignedEvent(event, feeAgreement) {
    const transaction = await Database.beginTransaction();
    let result;
    try {
      result = await this.storeHelloSignEvent(event, transaction);
      if (feeAgreement.fee_agreement_status_id === FeeAgreementStatus.PendingHiringAuthoritySignature) {
        result = await this.handleSignedByHiringAuthority(event, feeAgreement, transaction);
      } else if (feeAgreement.fee_agreement_status_id === FeeAgreementStatus.PendingProductionDirectorSignature){
        result = await this.handleSignedByProductionDirector(event, feeAgreement, transaction);
      }
      await transaction.commit();
      return result;
      
    } catch(error) {
      await transaction.rollback();
      throw error;
    }
  }

  async handleSignedByHiringAuthority(event, feeAgreement, externalTransaction) {
    let transaction;
    try {
      const currentEvent = FeeAgreementEventType.SignedByHiringAuthority;
      feeAgreement.fee_agreement_status_id = await this.calculateStatus(feeAgreement.fee_agreement_status_id, currentEvent, feeAgreement);
      feeAgreement.current_responsible = await this.getCurrentResponsible(feeAgreement.fee_agreement_status_id, feeAgreement);
      const real_date = new Date(event.event.event_time * 1000);
      feeAgreement.sign_url = event.signature_request.signing_url;
      feeAgreement.hiring_authority_sign_date = real_date;
      const eventData = {
        fee_agreement_id: feeAgreement.id,
        triggered_by_user_id: null,
        result_fee_agreement_status_id: feeAgreement.fee_agreement_status_id,
        event_type_id: currentEvent,
        event_details: event.event,
        real_date: real_date
      };
      transaction = externalTransaction ? externalTransaction : await Database.beginTransaction();
      await FeeAgreementEventLog.create(eventData, transaction);
      const result = await feeAgreement.save(transaction);
      if (!externalTransaction) {
        await transaction.commit();
      }
      Event.fire(EventType.CompanyFeeAgreement.SignedByHiringAuthority, {feeAgreement});
      return result;
    } catch(error) {
      if (!externalTransaction && transaction) {
        await transaction.rollback(); 
      }
      throw error;
    }
  }

  async handleSignedByProductionDirector(event, feeAgreement, externalTransaction) {
    let transaction;
    try {
      const currentEvent = FeeAgreementEventType.SignedByProductionDirector;
      feeAgreement.fee_agreement_status_id = await this.calculateStatus(feeAgreement.fee_agreement_status_id, currentEvent, {feeAgreement});
      feeAgreement.current_responsible = await this.getCurrentResponsible(feeAgreement.fee_agreement_status_id, feeAgreement);
      const real_date = new Date(event.event.event_time * 1000);
      feeAgreement.production_director_signed_date = real_date;
      feeAgreement.tracking_signed_date = await this.timeOffHelper.getBoardDate(real_date);
      feeAgreement.signed_date = feeAgreement.production_director_signed_date;
      const eventData = {
        fee_agreement_id: feeAgreement.id,
        triggered_by_user_id: null,
        result_fee_agreement_status_id: feeAgreement.fee_agreement_status_id,
        event_type_id: currentEvent,
        event_details: event.event,
        real_date
      };


      Event.fire(EventType.Company.FeeAgreementSigned, {
        companyId: feeAgreement.company_id,
        feeAgreementId: feeAgreement.id
      });

      transaction = externalTransaction ? externalTransaction : await Database.beginTransaction();
      await FeeAgreementEventLog.create(eventData, transaction);
      const result = await feeAgreement.save(transaction);
      await this.updateAssociatedWhiteSheets(feeAgreement.id, transaction);
      if (!externalTransaction) {
        await transaction.commit();
      }
      Event.fire(EventType.CompanyFeeAgreement.SignedByProductionDirector, {feeAgreement});
      return result;
    } catch(error) {
      if (!externalTransaction && transaction) {
        await transaction.rollback(); 
      }
      throw error;
    }
  }

  async handleSignatureRequestSent(event) {
    let transaction;
    try {
      const metadata = this.extractMetadata(event);
      if (!metadata) {
        return {
          success: false,
          code : 400,
          message: 'Event has not signature request metadata'
        }; 
      }
      const {feeAgreementId, senderUserId} = metadata;
      const feeAgreement = await CompanyFeeAgreement.find(feeAgreementId);
      if (!feeAgreement) {
        return {
          success: false,
          code : 404,
          message: 'Fee Agremeent not found'
        }; 
      }
      transaction = await Database.beginTransaction();
      feeAgreement.electronic_signature_provider_id = SignatureProvider.HelloSign;
      await feeAgreement.save(transaction);
      const feeAgreementContractManager = await FeeAgreementContractManager.buildDefault();
      await this.sendCCPDFemail(feeAgreement, feeAgreement.cc_emails, await feeAgreementContractManager.getFilesInBase64(feeAgreement));
      const validStatuses = [FeeAgreementStatus.PendingOperationsValidation, FeeAgreementStatus.PendingCoachValidation];
      if (!validStatuses.includes(feeAgreement.fee_agreement_status_id)) {
        await this.updatePDFURL(feeAgreement, transaction);
        transaction && await transaction.commit();
        return;
      }
      const currentEventId = FeeAgreementEventType.ValidatedByOperationsAndSentToSign;
      const fee_agreement_status_id = await this.calculateStatus(feeAgreement.fee_agreement_status_id, currentEventId, {feeAgreement});
      const real_date = new Date(event.event.event_time * 1000);
      const feeAgreementDataToMerge = this.clearDataForOperationsValidation({
        sign_url: event.signature_request.signing_url,
        fee_agreement_status_id,
        current_responsible: await this.getCurrentResponsible(fee_agreement_status_id, feeAgreement),
        validated_date:  real_date,
        tracking_sent_to_sign_date: await this.timeOffHelper.getBoardDate(real_date)
      });
      feeAgreement.merge(feeAgreementDataToMerge);
      const eventData = {
        fee_agreement_id: feeAgreement.id,
        triggered_by_user_id: senderUserId,
        result_fee_agreement_status_id: fee_agreement_status_id,
        event_details: this.unWrapValidableFields(feeAgreement),
        event_type_id: currentEventId,
        real_date
      };
      
      await feeAgreement.save(transaction);
      await this.updatePDFURL(feeAgreement, transaction);
      await FeeAgreementEventLog.create(eventData, transaction);
      await transaction.commit();
      return feeAgreement;
    } catch(error) {
      if (transaction) {
        await transaction.rollback(); 
      }
      throw error;
    }
  }

  async handleSignatureRequestViewed(event, feeAgreement, externalTransaction) {
    const transaction = externalTransaction ? externalTransaction : await Database.beginTransaction();
    try {
      const signatureRequest = event.signature_request;
      const relatedSignatureId = event.event.event_metadata.related_signature_id;
      const eventTypesMap = {
        'Hiring Authority': FeeAgreementEventType.SignatureRequestViewedByHiringAuthority,
        'Gpac Production Director': FeeAgreementEventType.SignatureRequestViewedByProductionDirector 
      }; 
      const storedHelloSignEvent = await this.storeHelloSignEvent(event, transaction); 
      if (!signatureRequest) {
        (!externalTransaction && transaction) && (await transaction.commit());
        return storedHelloSignEvent;
      }
      const filteredSignatures = signatureRequest.signatures.filter(signature => signature.signature_id === relatedSignatureId);
      const mostRecentSignatureViewed = filteredSignatures.length !== 0 ? filteredSignatures[0] : null;
      if (!mostRecentSignatureViewed) {
        (!externalTransaction && transaction) && (await transaction.commit());
        return storedHelloSignEvent;
      }
      const currentEventId = eventTypesMap[mostRecentSignatureViewed.signer_role];
      const feeAgreementEventLogData = {
        fee_agreement_id: feeAgreement.id,
        triggered_by_user_id: null,
        result_fee_agreement_status_id: feeAgreement.fee_agreement_status_id,
        event_details: {},
        event_type_id: currentEventId,
        associated_hello_sign_event_id: storedHelloSignEvent.id
      };
      await FeeAgreementEventLog.create(feeAgreementEventLogData, transaction);
      (!externalTransaction && transaction) && (await transaction.commit());
    } catch(error) {
      if (transaction) {
        (!externalTransaction && transaction) && (await transaction.rollback());
      }
      throw error;
    }
  }

  async handleSignatureRequestEmailBounce(event, feeAgreement, externalTransaction)  {
    const transaction = externalTransaction ? externalTransaction : await Database.beginTransaction();
    try {
      await this.genericHelloSignEventHandler(event, feeAgreement, transaction);
      (!externalTransaction && transaction) && (await transaction.commit());
    } catch(error) {
      (!externalTransaction && transaction) && (await transaction.rollback());
      throw error;
    }
  }

  async handleSignatureRequestReminded(event, feeAgreement, externalTransaction)  {
    const transaction = externalTransaction ? externalTransaction : await Database.beginTransaction();
    try {
      const eventDate = new Date(event.event.event_time * 1000);
      const oneHourInMiliseconds = 60 * 60 * 1000;
      if (Math.abs(eventDate.getTime() - (new Date()).getTime()) < oneHourInMiliseconds) {
        (!externalTransaction && transaction) && (await transaction.rollback());
        return;
      }
      await this.genericHelloSignEventHandler(event, feeAgreement, transaction);
      Event.fire(EventType.CompanyFeeAgreement.SignatureRequestEmailBounced, {feeAgreement});
      (!externalTransaction && transaction) && (await transaction.commit());
    } catch(error) {
      (!externalTransaction && transaction) && (await transaction.rollback());
      throw error;
    }
  }

  tryExtractFeeAgreementId(event) {
    if (event.signature_request && event.signature_request.metadata && event.signature_request.metadata.feeAgreementId) {
      return event.signature_request.metadata.feeAgreementId;
    }
    return null;
  }

  extractMetadata(event) {
    if (event.signature_request && event.signature_request.metadata && event.signature_request.metadata.feeAgreementId) {
      return event.signature_request.metadata;
    }
    return null;
  }

  async loadRelations(feeAgreement) {
    await feeAgreement.loadMany({
      'company':(builder) => builder.select('*'),
      'company.specialty': (builder) =>  { builder.select(['*']) },
      'company.files': (builder) =>  { builder.select(['*']) },
      'company.specialty.industry': (builder) =>  { builder.select(['*']) },
      'hiringAuthority': (builder) =>  builder.select(['*']) ,
      'feeAgreementStatus': (builder) =>   {
        builder.select(['id', 'internal_name'])
      },
      'feeAgreementStatus.group': (builder) =>   {
        builder.select(['id', 'title', 'style_class_name'])
      },
      'currentDeclinator': (builder) =>  {
        builder.select(['id', 'initials', 'role_id'])
      },
      'regional': (builder) =>  {
        builder.select(['id', 'initials'])
      },
      'regional.personalInformation': (builder) =>  {
        builder.select(['id', 'full_name'])
      },
      'currentDeclinator.personalInformation': (builder) =>  {
        builder.select(['id', 'full_name'])
      },
      'creator': (builder) =>  {
        builder.select(['id', 'initials'])
      },
      'creator.personalInformation': (builder) =>  {
        builder.select(['id', 'full_name'])
      },
      'coach': (builder) =>  {
        builder.select(['id', 'initials'])
      },
      'paymentScheme': (builder) => { builder.select('*') },
      'coach.personalInformation': (builder) =>  {
        builder.select(['id', 'full_name'])
      },
      'eventLogs': (builder) => {
        builder
          .select('id, fee_agreement_event_id', 'result_fee_agreement_status_id', 'event_type_id', 'event_details', Database.raw('COALESCE(real_date, created_at) as created_at'))
      },
      'eventLogs.event': (builder) => {builder.select('*')},
      'eventLogs.resultStatus': (builder) => {builder.select('*')},
    });
  }



  validateDeclinationDetails(declinationDetails, feeAgreement) {
    const fieldsValidationResult = this.validateDeclinedFields(declinationDetails.declined_fields, feeAgreement);
    const declinationNotesValidationResult = this.validateNotes(declinationDetails.declination_notes);
    const message = `${!fieldsValidationResult.valid ? fieldsValidationResult.message : ''}\n${!declinationNotesValidationResult.valid ? declinationNotesValidationResult.message : ''}`;
    const valid = fieldsValidationResult.valid && declinationNotesValidationResult.valid;
    return {valid, message};
  }

  validateDeclinedFields(declinedFields, feeAgreement) {
    let validDeclinableFields;
    if (feeAgreement.fee_agreement_payment_scheme_id === FeeAgreementPaymentSchemes.Standard || feeAgreement.fee_agreement_payment_scheme_id === FeeAgreementPaymentSchemes.BaseSalary) {
      validDeclinableFields = StandardFeeAgreementDeclinableField;
    } else if (feeAgreement.fee_agreement_payment_scheme_id === FeeAgreementPaymentSchemes.Flat){
      validDeclinableFields = FlatFeeAgreementDeclinableField;
    } else {
      validDeclinableFields = ConversionFeeAgreementDeclinableField;
    }
    if (Array.isArray(declinedFields) && declinedFields.length > validDeclinableFields.length) {
      return  {result: false, message: `Declined fields cannot be more than ${validDeclinableFields.length}`};
    }
    const invalidFields = Array.isArray(declinedFields) ? declinedFields.filter(declinedField => !validDeclinableFields.includes(declinedField)) : [];
    if (invalidFields.length > 0) {
      return {result: false, message: `Invalid fields found: ${invalidFields}, not found in valid fields: ${validDeclinableFields}`};
    }
    return {valid: true};
  }

  validateNotes(notes) {
    const valid = /\S/.test(notes);
    return {valid, message: !valid ? `Notes field can't be an empty text or white spaces only text` : ''};
  }

  /**
   * Returns data to clear when a FeeAgrement is validated by Coach
   *
   * @return {Object}
   */
  clearDataForCoachValidation() {
    return {
      current_declinator_id: null,
      declination_details: null
    };
  }
  /**
   * Returns data to clear when a FeeAgrement is validated by Coach
   *
   * @return {Object}
   */
  clearDataForOperationsValidation(inputData) {
    return {
      ...inputData,
      current_declinator_id: null,
      declination_details: null
    };
  }
  
  /**
   * Creates a Signature Request for a CompanyFeeAgreement using the hellosign API.
   * @param {CompanyFeeAgreement} feeAgreement 
   * @param {Company} company 
   * @param {HiringAuthority} hiringAuthority
   */

  async sendFeeAgreementToSign({feeAgreement, company, hiringAuthority, userId}) {
    const config = await ModulePresetsConfigRepository.getById('feeAgreement');
    const { defaultPayload, defaultCCRole } = config.data.signatureRequest;
    const productionDirector = (await feeAgreement.productionDirector().with('personalInformation').fetch()).toJSON();
    const templateId = feeAgreement.template_id ? feeAgreement.template_id : await this.getCorrespondingTemplateId(feeAgreement);
    const templateDetails = await helloSignProvider.getTemplateDetails(templateId);
    if (!templateDetails) {
      throw new NotFoundException(Antl.formatMessage('feeAgreement.error.helloSignTemplateNotFound'));
    }
    const customFieldsThatApply = templateDetails.template.custom_fields.map(({name}) => name);
    const customFields = this.formatCustomFields({feeAgreement, hiringAuthority, feeAgreement, productionDirector, company});
    const currentCustomFields = Object.keys(customFields);
    currentCustomFields.forEach(field => {
      if (!customFieldsThatApply.includes(field)) {
        delete customFields[field];
      }
    })
    
    
    const cc_emails = await this.getFeeAgreementCCEmails(feeAgreement, defaultCCRole, userId); 
    const requestPayload = {
      ...defaultPayload,
      subject: `${company.name} service agreement with gpac`,
      metadata: {feeAgreementId: feeAgreement.id, companyId: company.id, senderUserId: userId},
      template_id: templateId,
      custom_fields: customFields,
      signers: await this.formatSigners(hiringAuthority, productionDirector),
      ccs: cc_emails
    };
    return await helloSignProvider.createSignatureRequest(requestPayload);
  }

  async sendToSign(feeAgreement, userId, externalTransaction) {
    const transaction = externalTransaction ? externalTransaction : await Database.beginTransaction();
    const isAtomic = transaction && !this.externalTransaction;
    try {
      const feeAgreementSender = await FeeAgreementContractManager.buildDefault();
      const { providerId, contractSentDetails} = await feeAgreementSender.sendFeeAgreement({feeAgreement, userId});
      feeAgreement.electronic_signature_provider_id = providerId;
      feeAgreement.validated_date = new Date();
      feeAgreement.tracking_sent_to_sign_date = await this.timeOffHelper.getBoardDate(feeAgreement.validated_date);
      
      const fillContractInformation = this.fillContractInformationMap[providerId];
      if (!(fillContractInformation instanceof Function)) throw new Error(`There is not implementation to extract contract information for '${providerId}' signature provider`);
      fillContractInformation(feeAgreement, contractSentDetails);
      await feeAgreement.save(transaction);
      return {providerId, contractSentDetails};
    } catch(error) {
      isAtomic && (await transaction.rollback());
      throw error;
    }
  }

  formatOrdinal(n) {
    let s = ["th", "st", "nd", "rd"];
    let v = n%100;
    return n + (s[(v-20)%10] || s[v] || s[0]);
  }

  formatInteger(input) {
    const inputInNumber = typeof input === 'number' ? input : Number(input);
    return Number.parseInt(inputInNumber).toString();
  }


  formatCustomFields({feeAgreement, hiringAuthority, productionDirector, company}) {
    return {
      guarantee_days: this.formatOrdinal(feeAgreement.guarantee_days),
      fee_percentage: this.formatPercentage(feeAgreement.fee_percentage),
      hiring_authority_name: hiringAuthority.full_name,
      company_name: company.name,
      gpac_production_director_name: productionDirector.personalInformation.full_name,
      flat_fee_amount: this.formatMoney(feeAgreement.flat_fee_amount),
      fee_percent_integer: this.formatInteger(feeAgreement.fee_percentage),
      fee_percent_ordinal: this.formatOrdinal(this.formatInteger(feeAgreement.fee_percentage)),
    };
  }


  

  async getFeeAgreementCCEmails(feeAgreement, ccRole, senderId) {
    const coach = await feeAgreement.coach().fetch();
    const creator = await feeAgreement.creator().fetch();
    const emailsWithRepeatedElements = [...feeAgreement.cc_emails, coach.email, creator.email];
    const feeAgreementCCEmails = [...new Set(emailsWithRepeatedElements)];

    const cc_emails =feeAgreementCCEmails.map((email, index) => {
      return {
        email_address: email,
        role_name: `${ccRole}_${index + 1}`
      }
    });
    return cc_emails;
  }

  async sendReminderWithHelloSign({feeAgreement}) {
    const hiringAuthority = await HiringAuthority.find(feeAgreement.hiring_authority_id);
    const productionDirector = await User.find(feeAgreement.production_director_signer_id);
    const email = feeAgreement.fee_agreement_status_id === FeeAgreementStatus.PendingHiringAuthoritySignature ? hiringAuthority.work_email : productionDirector.email;
    const payload = {
      signatureRequestId: feeAgreement.contract_id,
      email: email
    };
    
    return await helloSignProvider.sendReminder(payload);
  }

  async sendReminderWithDocuSign(feeAgreement) {
    const reminderSentResult = await DocuSign.resendEnvelope(feeAgreement.contract_id);
    return reminderSentResult;
  }

  async sendReminder(id, userId, externalTransaction) {
    const transaction = externalTransaction ? externalTransaction : (await Database.beginTransaction());
    const isAtomic = (!externalTransaction) && transaction;
    try {
      const feeAgreement = await CompanyFeeAgreement.find(id);
      if (!feeAgreement) {
        isAtomic && await transaction.rollback();
        return {
          success: false,
          code : 404,
          message: Antl.formatMessage('feeAgreement.error.notFound')
        };
      }
      const isOperations = await UserRepository.hasRole(userId, userRoles.Operations);
      if (!(feeAgreement.creator_id == userId || feeAgreement.coach_id == userId || isOperations)){
        return {
          success: false,
          code : 403,
          message: Antl.formatMessage('feeAgreement.restriction.onlyOperationsTeamCanSendReminders')
        };
      }
      const oneHourInMilliseconds = 60 * 60 * 1000;
      const timeElapsedSinceLastReminder = feeAgreement.last_resend_time ? (new Date()).getTime() - (new Date(feeAgreement.last_resend_time)).getTime() : Number.MAX_VALUE;
      if (feeAgreement.electronic_signature_provider_id == SignatureProvider.HelloSign && timeElapsedSinceLastReminder < oneHourInMilliseconds) {
        const minutesElapsedSinceLastReminder = timeElapsedSinceLastReminder / 60000;
        const minutesLeftToSendReminder = 60 - minutesElapsedSinceLastReminder;
        return {
          success: false,
          code : 400,
          message: Antl.formatMessage('feeAgreement.restriction.onlyOneReminderPerHour', {minutes: Number.parseInt(minutesLeftToSendReminder)})
        };
      }
      if (!feeAgreement.contract_id) {
        isAtomic && await transaction.rollback();
        return {
          success: false,
          code : 404,
          message: Antl.formatMessage('feeAgreement.error.contractNotFound')
        };
      }
      const feeAgreementContractManager = await FeeAgreementContractManager.buildDefault();
      const reminderResult = await feeAgreementContractManager.sendReminder(feeAgreement);
      const eventData = {
        fee_agreement_id: feeAgreement.id,
        event_type_id: FeeAgreementEventType.SignatureReminderSent,
        triggered_by_user_id: userId,
        result_fee_agreement_status_id: feeAgreement.fee_agreement_status_id,
        event_details: reminderResult
      };
      feeAgreement.last_resend_time = new Date();
      await feeAgreement.save(transaction);
      await FeeAgreementEventLog.create(eventData, transaction);

      if (feeAgreement.fee_agreement_status_id == FeeAgreementStatus.PendingProductionDirectorSignature) {
        Event.fire(EventType.CompanyFeeAgreement.SignatureReminderSent, {feeAgreement});
      }
      isAtomic && await transaction.commit();
      await this.loadRelations(feeAgreement);
      return {
        data: feeAgreement,
        success: true,
        code: 200,
        message:  Antl.formatMessage('feeAgreement.success.reminderSent')
      };
    } catch(error) {
      appInsights.defaultClient.trackException({exception: error});
      isAtomic && await transaction.rollback();
      return {
        success: false,
        code: 500,
        message: Antl.formatMessage('feeAgreement.error.sendingReminder')
      };
    }
  }


  async createTemplateDraft(title, fileUrl) {
    const config = await ModulePresetsConfigRepository.getById('feeAgreement');
    const { defaultRequest } = config.data.embeddedTemplateDraft; 
    const payload = {
      ...defaultRequest,
      title: title,
      file_url: [fileUrl],
    };
    const response = await helloSignProvider.createEmbeddedTemplateDraft(payload);
    return response.template;
  }

  async getHistoryLog(id) {
    const logs = await FeeAgreementEventLog
                        .query()
                        .where('fee_agreement_id', id)
                        .with('resultStatus')
                        .with('event', builder => {
                          builder.where('show_in_history_log', true)
                        })
                        .orderBy('created_at', 'desc')
                        .fetch();
    return logs;
  }

  async getCountSummaryByStatus(userId, inputStatusIds, inputFilters) {
    const statusIds = this.parseArray(inputStatusIds);
    const filters = this.unWrapFilters(inputFilters);
    const countWithScope = (async (status) => {
      const queryCount =  this.buildFeeAgreementsBaseQuery()
        .select(Database.raw('count(*) as count'))
        .where('fee_agreement_status_id', status.id)
        .first();
      await this.applyUserScope(queryCount, userId);
      this.applyFilters(queryCount, filters);
      const {count} = await queryCount;
      return {
        ...status,
        count: Number(count)
      };
    }).bind(this);
    const statusesToCountQuery =  Database
      .from('fee_agreement_statuses')
      .select([
        'id',
        'internal_name',
        'style_class_name',
        'title'
      ]);
    if (Array.isArray(statusIds)) {
      statusesToCountQuery.whereIn('id', statusIds);
    }
    const statusesToCount = await statusesToCountQuery.orderBy('id', 'asc');
    const countPromises = statusesToCount.map(countWithScope);
    const result = await Promise.all(countPromises);
    return result;
  }

  async voidContract(id, userId, voidedReason, externalTransaction) {
    let transaction;
    try {
      const currentEventId = FeeAgreementEventType.VoidedByOperations;
      const isOperations = await UserRepository.hasRole(userId, userRoles.Operations);
      if (!isOperations) {
        throw new ForbiddenException(Antl.formatMessage('feeAgreement.restriction.onlyOperationsTeamCanVoidContracts'));
      }
      const feeAgreement = await CompanyFeeAgreement.find(id);
      if (!feeAgreement) {
        return {
          success: false,
          code: 404,
          message: Antl.formatMessage('feeAgreement.error.notFound')
        };
      }

      feeAgreement.fee_agreement_status_id = await this.calculateStatus(feeAgreement.fee_agreement_status_id, currentEventId, {feeAgreement});
      const eventData = {
        fee_agreement_id: feeAgreement.id,
        event_type_id: currentEventId,
        triggered_by_user_id: userId,
        result_fee_agreement_status_id: feeAgreement.fee_agreement_status_id,
        event_details: {voidedReason: voidedReason}
      };
      const feeAgreementContractManager = await FeeAgreementContractManager.buildDefault();
      await feeAgreementContractManager.voidContract(feeAgreement, voidedReason);
      transaction = externalTransaction ? externalTransaction : await Database.beginTransaction();
      await feeAgreement.save(transaction);
      await FeeAgreementEventLog.create(eventData, transaction);
      await this.deleteAssociationFromWhiteSheet(feeAgreement.id, transaction);
      await transaction.commit();
      await this.loadRelations(feeAgreement);
      Event.fire(EventType.CompanyFeeAgreement.Voided, {feeAgreement: feeAgreement});
      return {
        data: feeAgreement,
        success: true,
        code: 200,
        message: Antl.formatMessage('feeAgreement.success.voidSuccess')
      };
    } catch(error) {
      if (!externalTransaction && transaction) {
        await transaction.rollback();
      }
      return {
        success: false,
        code: 500,
        message: Antl.formatMessage('feeAgreement.error.voiding')
      };
    }
  }

  async cancelValidationRequest(id, userId, externalTransaction) {
    const transaction = externalTransaction ? externalTransaction : await Database.beginTransaction();
    const currentEventId = FeeAgreementEventType.ValidationRequestCanceled;
    const isAtomic = !externalTransaction && transaction;
    try {
      const feeAgreement = await CompanyFeeAgreement.find(id);
      if (!feeAgreement) {
        throw new NotFoundException(Antl.formatMessage('feeAgreement.error.notFound'));
      }
      const isCoach = await UserRepository.hasRole(userId, userRoles.Operations);
      if (!(feeAgreement.coach_id == userId || feeAgreement.creator_id == userId || isCoach || feeAgreement.regional_director_id == userId)) {
        throw new ForbiddenException(Antl.formatMessage('feeAgreement.restriction.onlyAssignedUsersCanCancelValidationRequest'));
      }
      
      const feeAgreementStatusId = await this.calculateStatus(feeAgreement.fee_agreement_status_id, currentEventId, {feeAgreement});
      const eventData = {
        fee_agreement_id: feeAgreement.id,
        triggered_by_user_id: userId,
        result_fee_agreement_status_id: feeAgreementStatusId,
        event_details: null,
        event_type_id: currentEventId,
      };
      feeAgreement.fee_agreement_status_id = feeAgreementStatusId;
      await feeAgreement.save(transaction);
      await FeeAgreementEventLog.create(eventData, transaction);
      await this.deleteAssociationFromWhiteSheet(feeAgreement.id, transaction);
      await isAtomic && (await transaction.commit());
      await this.loadRelations(feeAgreement);
      return feeAgreement;
    } catch(error) {
      await isAtomic && (await transaction.commit());
      appInsights.defaultClient.trackException({exception: error});
      throw error;
    }
  }
  
  async calculateStatus(input_current_status_id, input_event_type_id, context) {
    return await this.feeAgreementStatusCalculator.calculateStatus(input_current_status_id, input_event_type_id, context);
  }

  
  expandCustomFields(fieldsObject) {
    const keys = Object.keys(fieldsObject);
    const expandedFields = [];
    for(const key of keys) {
      expandedFields.push({
        name: key,
        value: `${fieldsObject[key]}`,
      });
    }
    return expandedFields;
  }

  async formatSigners(hiringAuthority, productionDirector) {
    const feeAgreementConfiguration = (await ModulePresetsConfigRepository.getById('feeAgreement')).data;
    const { hiringAuthoritySigner, productionDirectorSigner } = feeAgreementConfiguration.signatureRequest;

    return [
      {
        ...hiringAuthoritySigner,
        name: hiringAuthority.full_name,
        email_address: hiringAuthority.work_email
      },
      {
        ...productionDirectorSigner,
        email_address: productionDirector.email,
        name: productionDirector.personalInformation.full_name
      }
    ];
  }

  unWrapValidableFields = ({fee_percentage, guarantee_days, verbiage_changes}) => ({fee_percentage, guarantee_days, verbiage_changes});

  unWrapFeeAgreementDataForCreation = 
    ({
      fee_percentage,
      guarantee_days,
      notes,
      verbiage_changes,
      fee_percentage_change_requested,
      guarantee_days_change_requested,
      verbiage_changes_requested,
      company_id,
      hiring_authority_id,
      creator_id,
      template_id,
      cc_emails,
      subject,
      fee_agreement_payment_scheme_id,
      flat_fee_amount,
    }) =>  ({
      fee_percentage,
      guarantee_days,
      verbiage_changes: verbiage_changes ? verbiage_changes.trim() : null,
      notes: notes? notes.trim() : null,
      fee_percentage_change_requested,
      guarantee_days_change_requested,
      verbiage_changes_requested,
      company_id,
      hiring_authority_id,
      creator_id,
      template_id,
      cc_emails,
      subject,
      fee_agreement_payment_scheme_id,
      flat_fee_amount: Number(flat_fee_amount),
    });
  

  unWrapDeclinationDetails = ({declined_fields, declination_notes}) => ({declined_fields, declination_notes});
  unWrapDeclinedFields = (payload, declinedFields) => {
    const result = {};
    for(const field of declinedFields) {
      const value = payload[field];
      if (value != null) {
        result[field] = value;
       }
    }
    return result;
  }

  unWrapFilters = ({
    fee_agreement_status_id,
    fee_agreement_status_ids,
    status_ids,
    status_groups_ids,
    company_id,
    recruiter_id,
    coach_id,
    regional_director_id,
    guarantee_days,
    min_fee_percentage,
    max_fee_percentage,
    responsible_role_id,
    keyword,
    start_date_range,
    end_date_range,
    start_created_at,
    end_created_at,
    start_validated_date,
    end_validated_date,
    start_signed_date,
    end_signed_date,
    industry_id,
    specialty_id,
    subspecialty_id,
    timezone,
    specific_fee_agreement_status_ids,
    recruiterIds,
    coachIds,
    regionalDirectorIds,
    responsibleRoleIds,
    industryIds,
    specialtyIds,
    subspecialtyIds,
    guaranteeDaysIn,
    companyIds,
    countryIds,
    signatureProcessTypeId
  }) => ({
    fee_agreement_status_id,
    status_groups_ids: this.parseArray(status_groups_ids) || this.parseArray(fee_agreement_status_ids),
    status_ids: this.parseArray(status_ids) || this.parseArray(specific_fee_agreement_status_ids),
    company_id,
    recruiter_id,
    coach_id,
    regional_director_id,
    guarantee_days,
    min_fee_percentage,
    max_fee_percentage,
    responsible_role_id,
    keyword,
    start_date_range: parseDateWithOffset(start_date_range, timezone),
    end_date_range: parseDateWithOffset(end_date_range, timezone),
    start_created_at: parseDateWithOffset(start_created_at, timezone),
    end_created_at: parseDateWithOffset(end_created_at, timezone),
    start_validated_date: parseDateWithOffset(start_validated_date, timezone),
    end_validated_date: parseDateWithOffset(end_validated_date, timezone),
    start_signed_date: parseDateWithOffset(start_signed_date, timezone),
    end_signed_date: parseDateWithOffset(end_signed_date, timezone),
    industry_id,
    specialty_id,
    subspecialty_id,

    companyIds: this.parseArray(companyIds),
    countryIds: this.parseArray(countryIds),
    recruiterIds: this.parseArray(recruiterIds),
    coachIds: this.parseArray(coachIds),
    regionalDirectorIds: this.parseArray(regionalDirectorIds),
    responsibleRoleIds: this.parseArray(responsibleRoleIds),
    industryIds: this.parseArray(industryIds),
    specialtyIds: this.parseArray(specialtyIds),
    subspecialtyIds: this.parseArray(subspecialtyIds),
    guaranteeDaysIn: this.parseArray(guaranteeDaysIn),
    signatureProcessTypeId: this.parseArray(signatureProcessTypeId)
  });


  parseArray(input) {
    if (!input) return null;
    if (Array.isArray(input)) return input;
    try {
      const parsedInput = JSON.parse(input);
      return Array.isArray(parsedInput) ? parsedInput : [parsedInput];
    } catch(err) {
      const result = input.split(',');
      return result.length > 0 ? result : null; 
    }
  }

  defaultFilterResolver(query, column, value) {
    query.where(column, value);
  }

  inQueryResolver(query, column, arrayOfValues) {
    query.whereIn(column, arrayOfValues);
  }

  operatorFilterResolverFactory(operator) {
    return (query, column, value) => {
      query.where(column, operator, value);
    };
  }


  defaultOrderResolver(query, column, inputDirection) {
    const direction = inputDirection ? inputDirection : '';
    const orderColumn = this._orderColumnsMap[column];
    
    if (!orderColumn) {
      return;
    }
    const orderDirection = this._orderDirections.includes(direction.toUpperCase()) ? direction : this._orderDirections[0];
    query.orderByRaw(`${orderColumn} ${orderDirection} NULLS LAST`);
  }

  /**
   * Get the highest role in the context of the Fee Agreement process
   *
   * @param {Number} data
   * 
   * @return {Object} CompanyFeeAgreement
   */

  async getHighestRoleId(userId) {
    const isProductionDirector = await UserRepository.hasRole(userId, userRoles.ProductionDirector);
    if (isProductionDirector) {
      return userRoles.ProductionDirector;
    }
    const isOperations = await UserRepository.hasRole(userId, userRoles.Operations);
    if (isOperations) {
      return userRoles.Operations;
    }

    const isRegionalDirector = await UserRepository.hasRole(userId, userRoles.RegionalDirector);
    if (isRegionalDirector) {
      return userRoles.RegionalDirector;
    }

    const isCoach = await UserRepository.hasRole(userId, userRoles.Coach);
    if (isCoach) {
      return userRoles.Coach;
    }
    const isRecruiter = await UserRepository.hasRole(userId, userRoles.Recruiter);
    if (isRecruiter) {
      return userRoles.Recruiter;
    }
    throw new Error(`No one of the user's roles has scope in Fee Agreement`);
  }

  async getCurrentResponsible(input_current_status_id, feeAgreement) {
    this.feeAgreementStatusCalculator.getCurrentResponsible(input_current_status_id, feeAgreement);
  }

  async getFullName(userId) {
    const details = await UserRepository.getDetails(userId);
    return details.full_name;
  }

  operatorFilterResolverFactory(operator) {
    return (query, column, value) => {
      query.where(column, operator, value);
    };
  }

  applyKeywordFilters(query, keywordColumns, value) {
    query.where(function() {
      for(const keywordColumn of keywordColumns) {
        this.orWhere(keywordColumn, 'ilike', `%${value}%`);
      }
    })
  }

  applyFilters(query, filters) {
    for(const property in filters) {
      const value = filters[property];
      if (value == null || value === '') {
        continue;
      }
      const resolver = this._filterResolvers[property];
      if (!(resolver instanceof Function)) {
        throw new Error(Antl.formatMessage('feeAgreement.error.columFilterNotsupported', {column: property}));
      }
      resolver(query, this._filterColumnsMap[property], value);
    }
    const repeatedFilteredStatusesArray = [
      ...(Array.isArray(filters.status_ids) ? filters.status_ids : []), 
      filters.fee_agreement_status_id
    ].filter(n => n && Number.isInteger(n));
    const filteredStatuses = Array.from(new Set(repeatedFilteredStatusesArray));
    query.where((builder) => {
      builder.whereIn('fas.id', filteredStatuses).orWhere('fas.hidden', false);
    });
  }  

  async getFullName(userId) {
    const details = await UserRepository.getDetails(userId);
    return details.full_name;
  }

  async getBasicData(id) {
    const feeAgreement = await CompanyFeeAgreement
      .query()
      .where('id', id)
      .first();
    return feeAgreement;
  }

  async getFeeAgreementSignedCount(startDate, endDate) {
    const result = await CompanyFeeAgreement.query()
      .where((builder) => builder.where('signed_date', '>=', startDate).where('signed_date', '<', endDate))
      .count();

    return result[0].count;
  }

  async getFeeAgreementValidatedCount(startDate, endDate) {
    const result = await CompanyFeeAgreement.query()
      .where((builder) => builder.where('validated_date', '>=', startDate).where('validated_date', '<', endDate))
      .count();

    return result[0].count;
  }

  async getTemplateByAgreementId(id) {
    try {
      const feeAgreement = await this.getBasicData(id);
      if (!feeAgreement) {
        return {
          code: 404,
          success: false,
          message: Antl.formatMessage('feeAgreement.error.notFound'),
        };
      }
      const templateId = feeAgreement.template_id || (await this.getCorrespondingTemplateId(feeAgreement));
      const templateStream = await helloSignProvider.getTemplateFile(templateId);
      
      if (!templateStream) {
        return {
          code: 404,
          message: Antl.formatMessage('feeAgreement.error.helloSignTemplateNotFound')
        }
      }
      
      return {
        code: 200,
        success: true,
        data: templateStream
      };
    } catch(error) {
      appInsights.defaultClient.trackException({exception: error});
      return {
        success: false,
        code: 500,
        message: Antl.formatMessage('feeAgreement.error.gettingTemplate')
      };
    }
  }

  async getTemplateById(id) {
    try {
      const templateStream = await helloSignProvider.getTemplateFile(id);
      
      if (!templateStream) {
        return {
          code: 404,
          message: Antl.formatMessage('feeAgreement.error.helloSignTemplateNotFound')
        }
      }
      
      return {
        code: 200,
        success: true,
        data: templateStream
      };
    } catch(error) {
      appInsights.defaultClient.trackException({exception: error});
      return {
        success: false,
        code: 500,
        message: Antl.formatMessage('feeAgreement.error.fetchingTemplateFromHellosign')
      };
    }
  }

  async getTemplatesIds() {
    try {
      const config = await ModulePresetsConfigRepository.getById('feeAgreement');
      const templatesIds  = config.data.defaultValues.template_ids;

      return {
        code: 200,
        success: true,
        data: templatesIds
      };
    } catch (error) {
      appInsights.defaultClient.trackException({exception: error});
      return {
        success: false,
        code: 500,
        message: Antl.formatMessage('feeAgreement.error.gettingTemplatesFromConfig')
      };
    }
  }

  async updateEmails(id, userId, updateSignersInfo) {
    let transaction;
    const { email: newEmail, cc_emails, update_ha: shouldUpdateHA } = updateSignersInfo;
    
    try {
      const feeAgreement = await CompanyFeeAgreement.find(id);
      if (!feeAgreement) {
        return {
          success: false,
          code: 404,
          message: Antl.formatMessage('feeAgreement.error.notFound'),
        };
      }
      const feeAgreementContractManager = await FeeAgreementContractManager.buildDefault();
      const currentSignerEmail = await feeAgreementContractManager.getSignatureEmailBySignerRole(feeAgreement, 'Hiring Authority');

      if (!currentSignerEmail) {
        return {
          success: false,
          code: 404,
          message: 'Signature not found',
        };
      }
      transaction = await Database.beginTransaction();
      if (newEmail.toLowerCase() !== currentSignerEmail.toLowerCase()) {
        await feeAgreementContractManager.updateHiringAuthoritySignerEmail(feeAgreement, newEmail);
        feeAgreement.merge({
          ha_email: newEmail,
        });
        if(shouldUpdateHA) {
          await HiringAuthorityRepository.update(feeAgreement.hiring_authority_id, {work_email: newEmail}, transaction);
        }
        await feeAgreement.save(transaction);
        await FeeAgreementEmails.sendHiringAuthorityThankEmail(feeAgreement);
      }
      
      const lowerCaseCurrentCCEmails = feeAgreement.cc_emails.map(email => email.toLowerCase());
      const lowerCaseNewCCEmails = cc_emails.map(email => email.toLowerCase());
      const shouldUpdateCCEmails = !(
        lowerCaseCurrentCCEmails.length === lowerCaseNewCCEmails.length
        && !lowerCaseNewCCEmails.map(newEmail => !lowerCaseCurrentCCEmails.includes(newEmail)).includes(false)
      );
      
      if (shouldUpdateCCEmails) {
        feeAgreement.merge({cc_emails: lowerCaseNewCCEmails});
        await feeAgreement.save(transaction); 
      }

      await FeeAgreementEventLog.create(
        {
          fee_agreement_id: id,
          triggered_by_user_id: userId,
          result_fee_agreement_status_id: feeAgreement.status_id,
          event_details: { email: newEmail },
          event_type_id: FeeAgreementEventType.SignerEmailUpdated,
        },
        transaction
      );
      await transaction.commit();
      await this.loadRelations(feeAgreement);
      if (shouldUpdateCCEmails) {
        const emailsThatWereNotIncludedBefore = lowerCaseNewCCEmails.filter(email => !lowerCaseCurrentCCEmails.includes(email));
        await this.sendCCPDFemail(feeAgreement, emailsThatWereNotIncludedBefore, await feeAgreementContractManager.getFilesInBase64(feeAgreement));
      }

      return {
        code: 200,
        success: true,
        data: feeAgreement,
      };
    } catch (error) {
      transaction && (await transaction.rollback());
      appInsights.defaultClient.trackException({ exception: error });
      return {
        success: false,
        code: 500,
        message: (error && error.message) || Antl.formatMessage('feeAgreement.error.updatingEmails'),
      };
    }
  }

  /**
   * Send a validation notification email from fee agrement
   *
   * @summary An Email that is usually directed to the coach of the recruter when a non-standard fee is created
   *
   * @param {CompanyFeeAgreement} feeAgreement - CompanyFeeAgreement instance
   * @param {String} emails - An array of emails that will receive the email
   * @param {String} attachmentData - String containing base64 attachment data.
   *
   * @return {Object} Sendgrid response
   */
  async sendCCPDFemail(feeAgreement, inputEmails, attachmentData) {
    try {
      const emails = Array.isArray(inputEmails) ? [...inputEmails] : [];
      if (emails.length == 0) return;
      const hiringAuthority = await feeAgreement.hiringAuthority().fetch();
      const company  = await feeAgreement.company().fetch();
      const hiringAuthorityEmail = feeAgreement.ha_email ? feeAgreement.ha_email.toLowerCase() : hiringAuthority.work_email.toLowerCase();
      const ccsToSendPDF = emails.filter(email => email.toLowerCase() != hiringAuthorityEmail);
      const recipients = ccsToSendPDF.map((email) => {
        return {
          to: {
            name: 'Gpac Client Service',
            email: email,
          },
          dynamic_template_data: {
            company_name: company.name
          }
        };
      });

      const generalDynamicTemplateData = null; //We do not need generic template data at the moment

      const sendgridConfigurationName = 'feePDFCCEmail';
      const attachments = [
        {
          filename: `Service_agreement_with_gpac.pdf`,
          content: attachmentData,
          type: 'application/pdf',
          disposition: 'attachment'
        }
      ];
      const response = await GenericSendgridTemplateEmail.sendViaConfig(
        recipients,
        generalDynamicTemplateData,
        sendgridConfigurationName,
        attachments
      );

      return {
        success: true,
        response
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
      return {
        success: false,
        error,
      };
    }
  }

  async expireFeeAgreement(id, externalTransaction) {
    let transaction;
    try {
      const currentEventId = FeeAgreementEventType.VoidedByExpiration;
      const feeAgreement = await CompanyFeeAgreement.find(id);
      if (!feeAgreement) {
        return false;
      }
      feeAgreement.fee_agreement_status_id = await this.calculateStatus(feeAgreement.fee_agreement_status_id, currentEventId);
      const eventData = {
        fee_agreement_id: feeAgreement.id,
        event_type_id: currentEventId,
        result_fee_agreement_status_id: feeAgreement.fee_agreement_status_id
      };
      
      const feeAgreementContractManager = await FeeAgreementContractManager.buildDefault();
      if ((await feeAgreementContractManager.checkIfContractExists(feeAgreement))){
        await feeAgreementContractManager.voidContract(feeAgreement);
      }
      
      transaction = externalTransaction ? externalTransaction : await Database.beginTransaction();
      await feeAgreement.save(transaction);
      await FeeAgreementEventLog.create(eventData, transaction);
      await transaction.commit();
      Event.fire(EventType.CompanyFeeAgreement.Expired, {feeAgreement: feeAgreement});
      return true;
    } catch(error) {
      if (!externalTransaction && transaction) {
        await transaction.rollback();
      }
      return false;
    }
  }

  async restoreExpired(id, userId, externalTransaction) {
    const transaction = externalTransaction ? externalTransaction : await Database.beginTransaction();
    const isAtomic = transaction && !externalTransaction;
    const currentEventId = FeeAgreementEventType.Restored;
    try {
      const feeAgreement = await CompanyFeeAgreement.find(id);
      if (!feeAgreement) {
        throw new NotFoundException(Antl.formatMessage('feeAgreement.error.notFound'));
      }

      const isOperations = await UserRepository.hasRole(userId, userRoles.Operations);
      if (!(isOperations || feeAgreement.creator_id == userId || feeAgreement.coach_id == userId || feeAgreement.regional_director_id == userId)) {
        throw new ForbiddenException(Antl.formatMessage('feeAgreement.restriction.onlyOperationsTeamCanRestoreFeeAgreements'));
      }
      const fee_agreement_status_id = await this.calculateStatus(feeAgreement.fee_agreement_status_id, currentEventId);
      const {contractSentDetails} = await this.sendToSign(feeAgreement, userId, transaction);
      const eventData = {
        fee_agreement_id: feeAgreement.id,
        triggered_by_user_id: userId,
        result_fee_agreement_status_id: fee_agreement_status_id,
        event_type_id: currentEventId,
        event_details: {
          contractSentDetails,
          fee_agreement: this.unWrapValidableFields(feeAgreement)
        }
      };
      feeAgreement.fee_agreement_status_id = fee_agreement_status_id;
      await feeAgreement.save(transaction);
      await FeeAgreementEventLog.create(eventData, transaction);
      isAtomic && (await transaction.commit());
      return feeAgreement;
    } catch(error) {
      isAtomic && (await transaction.rollback());
      appInsights.defaultClient.trackException({exception: error});
      throw error;
    }
  }


  async registerAboutToExpire(id, daysLeft, externalTransaction) {
    let transaction;
    try {
      const currentEventId = FeeAgreementEventType.AboutToExpire;
      const feeAgreement = await CompanyFeeAgreement.find(id);
      if (!feeAgreement) {
        return false;
      }
      const eventData = {
        fee_agreement_id: feeAgreement.id,
        event_type_id: currentEventId,
        result_fee_agreement_status_id: feeAgreement.fee_agreement_status_id
      };
      transaction = externalTransaction ? externalTransaction : await Database.beginTransaction();
      await feeAgreement.save(transaction);
      await FeeAgreementEventLog.create(eventData, transaction);
      await transaction.commit();
      Event.fire(EventType.CompanyFeeAgreement.AboutExpire, {feeAgreement: feeAgreement, daysLeft});
      return true;
    } catch(error) {
      if (!externalTransaction && transaction) {
        await transaction.rollback();
      }
      return false;
    }
  }

  async createUnManaged({inputData, userId, externalTransaction}) {
    const transaction = externalTransaction ? externalTransaction : await Database.beginTransaction();
    const isAtomic = transaction && !externalTransaction;

    try {
      const { hasAtLeastOne, assignedRoles  } = await UserRepository.hasRoles(userId, [userRoles.Operations, userRoles.Recruiter, userRoles.Coach, userRoles.RegionalDirector]);
      if (!hasAtLeastOne) {
        throw new ForbiddenException(`Current user has not any valid role to perform this operation`);
      }
      const assignedRolesAsStrings = assignedRoles.map(role => `${role}`);
      const isOperations = assignedRolesAsStrings.includes(`${userRoles.Operations}`);
      const result = isOperations ? 
          await this.createUnManagedByOperations({inputData, userId, externalTransaction}) 
        : await this.createUnManagedByRecruiterCoachOrRegionalDirector({inputData, userId, externalTransaction});
      isAtomic && (await transaction.commit());
      return result;
    } catch(error) {
      isAtomic && (await transaction.rollback());
      throw error;
    }

  }

  async createUnManagedByRecruiterCoachOrRegionalDirector({inputData, userId, externalTransaction}) {
    const transaction = externalTransaction ? externalTransaction : await Database.beginTransaction();
    const isAtomic = transaction && !externalTransaction;
    try {
      const highestRole = await this.getHighestRoleId(userId);
      const feeAgreement = await this.storeUnManagedFeeAgreement({inputData, creatorRole: highestRole, recruiterId: userId, externalTransaction: transaction});
      isAtomic && (await transaction.commit());
      return feeAgreement;
    } catch(error) {
      isAtomic && (await transaction.rollback());
      throw error;
    }
  }

  async createUnManagedByOperations({inputData, externalTransaction}) {
    const transaction = externalTransaction ? externalTransaction : await Database.beginTransaction();
    const isAtomic = transaction && !externalTransaction;
    try {
      const { overridden_user_id: recruiterId } = inputData;
      if (!recruiterId) {
        throw new BadRequestException(`Fee Agreement must have an assigned recruiter`);
      }
      const feeAgreement = await this.storeUnManagedFeeAgreement({inputData, creatorRole: userRoles.Operations, recruiterId, externalTransaction: transaction});
      isAtomic && (await transaction.commit());
      if (feeAgreement.fee_agreement_status_id == FeeAgreementStatus.Signed) {
        Event.fire(EventType.CompanyFeeAgreement.SignedUnManaged, {
          feeAgreement
        });
        Event.fire(EventType.Company.FeeAgreementSigned, {
          companyId: feeAgreement.company_id,
          feeAgreementId: feeAgreement.id
        });
      }
      return feeAgreement;
    } catch(error) {
      isAtomic && (await transaction.rollback());
      throw error;
    }
  }

  async storeUnManagedFeeAgreement({userId, inputData, creatorRole, recruiterId, externalTransaction}) {
    const transaction = externalTransaction ? externalTransaction : await Database.beginTransaction();
    const isAtomic = transaction && !externalTransaction;
    try {
      const  { fee_agreement_file } = inputData;
      const {regional_director_id, coach_id} = await UserRepository.getCoachAndRegionalDirector(recruiterId);
      const config = await ModulePresetsConfigRepository.getById('feeAgreement');
      const feeAgreementDefaults  = config.data.defaultValues;
      const feeAgreementData =  {
        ...(await this.unWrapFeeAgreementDataForUnManagedCreation(inputData)),
        regional_director_id,
        coach_id,
        creator_id: recruiterId,
        signature_process_type_id: FeeAgreementSignatureProcessType.ExternalUnmanaged,
        production_director_signer_id: feeAgreementDefaults.production_director_id,
      };
      if (!this.isSentDateBeforeSignDate({inputSentDate: feeAgreementData.validated_date, inputSignedDate: feeAgreementData.signed_date})) throw new Error(`Signature Date must be after Sent Date`);

      const { fee_agreement_status_id, event_type_id } = await this.feeAgreementStatusCalculator.calculateInitialStatusAndInitialEventUnmanaged(feeAgreementData, creatorRole);
      feeAgreementData.fee_agreement_status_id = fee_agreement_status_id;
      const feeAgreement = await CompanyFeeAgreement.create(feeAgreementData, transaction);
      if (fee_agreement_file) {
        await this.updateFeeAgreementPdfUrlFromFortpacFile(fee_agreement_file, feeAgreement, transaction);
      }
      await this.storeUnmanagedCreationEvent({userId, feeAgreement, event_type_id, externalTransaction});
      isAtomic && (await transaction.commit());
      return feeAgreement;
    } catch (error) {
      isAtomic && (await transaction.rollback());
      throw error;
    }
  }

  isSentDateBeforeSignDate({inputSentDate, inputSignedDate}) {
    const validatedDate = inputSentDate instanceof Date ? inputSentDate : new Date(inputSentDate);
    if (Number.isNaN(validatedDate)) throw new Error('validated_date is not a valid date');

    const signedDate = inputSignedDate instanceof Date ? inputSignedDate : new Date(inputSignedDate);
    if (Number.isNaN(signedDate)) throw new Error('signed_date is not a valid date');

    return signedDate.getTime() >= validatedDate.getTime();
  }

  async storeUnmanagedCreationEvent({userId, feeAgreement, event_type_id, externalTransaction}) {
    const transaction = externalTransaction ? externalTransaction : await Database.beginTransaction();
    const isAtomic = transaction && !externalTransaction;
    try {
      const eventData = {
        fee_agreement_id: feeAgreement.id,
        triggered_by_user_id: userId,
        result_fee_agreement_status_id: feeAgreement.fee_agreement_status_id,
        event_details: feeAgreement,
        event_type_id: event_type_id,
      };
      await FeeAgreementEventLog.create(eventData, transaction);
    } catch(error) {
      isAtomic && (await transaction.rollback());
      throw error;
    }
  }

  unWrapFeeAgreementDataForUnManagedCreation = async({
      fee_percentage,
      signed_date,
      guarantee_days,
      notes,
      verbiage_changes,
      fee_percentage_change_requested,
      guarantee_days_change_requested,
      verbiage_changes_requested,
      hiring_authority_id,
      fee_agreement_payment_scheme_id,
      flat_fee_amount,
      validated_date,
      company_id,
      
    }) => ({
      company_id,
      fee_percentage,
      signed_date,
      guarantee_days,
      verbiage_changes: verbiage_changes ? verbiage_changes.trim() : null,
      notes: notes? notes.trim() : null,
      fee_percentage_change_requested,
      guarantee_days_change_requested,
      verbiage_changes_requested,
      hiring_authority_id,
      fee_agreement_payment_scheme_id,
      flat_fee_amount: Number(flat_fee_amount),
      validated_date,
      tracking_signed_date: await this.timeOffHelper.getBoardDate(signed_date),
      tracking_sent_to_sign_date: validated_date ? await this.timeOffHelper.getBoardDate(validated_date) : await this.timeOffHelper.getBoardDate(signed_date),
    });

    unWrapFeeAgreementDataForUnManagedValidation = async({
      fee_percentage,
      signed_date,
      guarantee_days,
      notes,
      verbiage_changes,
      fee_percentage_change_requested,
      guarantee_days_change_requested,
      verbiage_changes_requested,
      hiring_authority_id,
      fee_agreement_payment_scheme_id,
      flat_fee_amount,
      validated_date
    }) =>  ({
      fee_percentage,
      guarantee_days,
      validated_date,
      signed_date,
      verbiage_changes: verbiage_changes ? verbiage_changes.trim() : null,
      notes: notes? notes.trim() : null,
      fee_percentage_change_requested,
      guarantee_days_change_requested,
      verbiage_changes_requested,
      hiring_authority_id,
      fee_agreement_payment_scheme_id,
      flat_fee_amount: Number(flat_fee_amount),
      tracking_signed_date: await this.timeOffHelper.getBoardDate(signed_date),
      tracking_sent_to_sign_date: validated_date ? await this.timeOffHelper.getBoardDate(validated_date) : await this.timeOffHelper.getBoardDate(signed_date),
    });

  async operationsValidationForUnmanaged({id, inputData, userId, externalTransaction}) {
    const transaction = externalTransaction ? externalTransaction : await Database.beginTransaction();
    const isAtomic = transaction && !externalTransaction;
    try {
      const isOperations = await UserRepository.hasRole(userId, userRoles.Operations);
      if (!isOperations) {
        throw new ForbiddenException(Antl.formatMessage('feeAgreement.restriction.onlyOperationsTeamCanValidateExistingFeeAgreements'));
      }
      const feeAgreement = await CompanyFeeAgreement.find(id);
      if (!feeAgreement) {
        throw new NotFoundException(Antl.formatMessage('feeAgreement.error.notFound'));
      }

      if (feeAgreement.signature_process_type_id != FeeAgreementSignatureProcessType.ExternalUnmanaged) {
        throw new BadRequestException(Antl.formatMessage('feeAgreement.restriction.cannotBeValidatedAsExistingAgreement'));
      }
      const currentEventId = feeAgreement.fee_agreement_status_id == FeeAgreementStatus.Signed ? FeeAgreementEventType.UpdatedByOperations : FeeAgreementEventType.UnmanagedValidatedByOperations;
      const {fee_agreement_file, overridden_user_id: recruiter_id} = inputData;

      if (!feeAgreement.pdf_url && !fee_agreement_file) {
        throw new BadRequestException(Antl.formatMessage('feeAgreement.restriction.cannotBeValidatedAsExistingAgreement'));
      }
      if (fee_agreement_file) {
        await this.updateFeeAgreementPdfUrlFromFortpacFile(fee_agreement_file, feeAgreement, transaction);
      }
      
      const { hasAtLeastOne } =  recruiter_id ? await UserRepository.hasRoles(recruiter_id, [userRoles.Recruiter, userRoles.RegionalDirector, userRoles.Coach]) : {hasAtLeastOne: false};
      const creator_id = hasAtLeastOne ? recruiter_id : feeAgreement.creator_id;
      const {regional_director_id, coach_id} = await UserRepository.getCoachAndRegionalDirector(creator_id);
      const unWrappedData = (await this.unWrapFeeAgreementDataForUnManagedValidation(inputData));
      feeAgreement.merge({
        ...unWrappedData,
        creator_id: hasAtLeastOne ? recruiter_id : feeAgreement.creator_id,
        operations_validator_id: userId,
        regional_director_id,
        coach_id,
        fee_agreement_status_id: await this.feeAgreementStatusCalculator.calculateStatus(feeAgreement.fee_agreement_status_id, currentEventId, {feeAgreement}),
      });
      
      const eventData = {
        fee_agreement_id: feeAgreement.id,
        triggered_by_user_id: userId,
        result_fee_agreement_status_id: feeAgreement.fee_agreement_status_id,
        event_details: feeAgreement,
        event_type_id: currentEventId,
      };
      await FeeAgreementEventLog.create(eventData, transaction);
      await feeAgreement.save(transaction);
      isAtomic && (await transaction.commit());
      Event.fire(EventType.Company.FeeAgreementSigned, {
        companyId: feeAgreement.company_id,
        feeAgreementId: feeAgreement.id
      });
      return feeAgreement;
    } catch(error) {
      isAtomic && (await transaction.rollback());
      throw error;
    }
  }

  async updateFeeAgreementPdfUrlFromFortpacFile(fileInfo, feeAgreement, externalTransaction) {
    const transaction = externalTransaction ? externalTransaction : await Database.beginTransaction();
    const isAtomic = transaction && !externalTransaction;
    const {entity, id} = fileInfo;
    const validEntitySources = [FeeAgreementFileEntitySources.TemporalFeeAgreementFile, FeeAgreementFileEntitySources.CompanyFile];
    if (!validEntitySources.includes(entity)) throw new BadRequestException(Antl.formatMessage('feeAgreement.error.badFile', {entity}));
    try {
      const targetTable = entity == FeeAgreementFileEntitySources.TemporalFeeAgreementFile ? 'user_has_temp_files' : 'company_has_files';
      const file = await Database.table(targetTable).where('id', id).select('*').first();
      const fileCopyResult = await copyFile(file.url, 'fee_agreements', `fee_agreement_${feeAgreement.id}.pdf`);
      if(!fileCopyResult.success){
        throw fileCopyResult.error;
      }
      feeAgreement.pdf_url = fileCopyResult.url || null;
      fileCopyResult.url && (await feeAgreement.save(transaction));
      isAtomic && transaction.commit();
    } catch(error) {
      isAtomic && (await transaction.rollback());
      throw error;
    }
  }

  async getOverridableUsers(userId) {
    const { hasAtLeastOne,  assignedRoles } = await UserRepository.hasRoles(userId, [userRoles.Operations, userRoles.RegionalDirector, userRoles.Coach]);
    if (!hasAtLeastOne) return [];
    let subQuery = null;

    if (assignedRoles.includes(userRoles.Operations)) {
      subQuery = Database.table('user_has_roles').select('user_id')
        .whereIn('role_id', [userRoles.RegionalDirector, userRoles.Coach, userRoles.Recruiter]);
    } else if (assignedRoles.includes(userRoles.RegionalDirector)) {
      const recruitersQuery = Database.table('recruiter_has_industries').select('recruiter_id as user_id')
        .where('regional_director_id', userId);
      const coachesQuery = Database.table('recruiter_has_industries').select('coach_id as user_id')
        .where('regional_director_id', userId);

      subQuery = recruitersQuery.union(coachesQuery);
    } else if (assignedRoles.includes(userRoles.Coach)) {
      subQuery = Database.table('recruiter_has_industries')
        .select('recruiter_id as user_id')
        .where('coach_id', userId);
    } else {
      return [];
    }

    return await User
      .query()
      .select([
        'users.id as id',
        'pi.full_name',
        ])
      .leftJoin('personal_informations as pi', 'users.personal_information_id', 'pi.id')
      .whereIn('users.id', subQuery)
      .where('users.id', '!=', userId)
      .orderBy('pi.full_name')
      .fetch();
  }

  async sendUnsignedAgreements() {
    const sendgridConfigurationKey = 'FeeAgreementsUnsigned';
    const unsignedAgreementsConfigurationKey = 'feeAgreementUnsignedEmail';

    const additionalConfig = await ModulePresetsConfigRepository.getById(unsignedAgreementsConfigurationKey);
    if (!additionalConfig) throw Antl.formatMessage('feeAgreement.error.emailConfigMissing');

    const { to } = additionalConfig.data;
    if (!to) throw Antl.formatMessage('feeAgreement.error.emailConfigMissing');

    const unsignedAgreements = await this.getUnsignedAgreementForEmails();
    const templateData = {
      items: unsignedAgreements,
      url: `${Env.get('PUBLIC_URL_WEB')}/feeagreements`,
      period: this.timeOffHelper.isMonday() ? 'the last week' : 'the current week'
    };

    const emailResponse = await GenericSendgridTemplateEmail.sendViaConfig(
      [{ to }],
      templateData,
      sendgridConfigurationKey
    );

    return emailResponse;
  }

  async getUnsignedAgreementForEmails() {
    let periodClause = '';

    if(this.timeOffHelper.isMonday()) {
      const clauseForPreviousWeek = `date_trunc('week', tracking_sent_to_sign_date) = date_trunc('week', now() - INTERVAL '1 WEEK')`
      periodClause = clauseForPreviousWeek;
    } else {
      const clauseForCurrentWeek = `tracking_sent_to_sign_date::date >= date_trunc('week', now()) and tracking_sent_to_sign_date::date <= (now() - INTERVAL '1 DAY')::date`
      periodClause = clauseForCurrentWeek;
    }
    
    const query = this.buildFeeAgreementsBaseQuery()
    .select([
      'fa.id as id',
      Database.raw(`
      to_char(timezone('US/Central', fa.validated_date)::date, 'mm-dd-yyyy') as sent`),
      'recruiter.initials as recruiter',
      'coach.initials as coach',
      'regional_director.initials as regional',
      'cp.name as company',
      'ha.full_name as hiringAuthority',
      Database.raw(`
      CASE
        WHEN fee_agreement_payment_scheme_id <> 'flat' then to_char(fee_percentage, '99.9%')::text
        ELSE cast(flat_fee_amount::numeric as money)::text
      END AS fee
    `),
      'fa.fee_agreement_payment_scheme_id as type',
      'fa.guarantee_days as guaranteeDays',
      'spec.industry as industry',
      'spec.title as specialty',
      'recruiter.user_name as recruiterName',
      'coach.user_name as coachName',
      'regional_director.user_name as regionalName',
    ])
    .whereRaw(`fee_agreement_status_id = 1 and ${periodClause}`)
    .orderByRaw('coach.user_name, recruiter.user_name, fa.validated_date desc');

    const results = await query;

    return addToggler(results);
  }

  async getDailySignedTotalForTracking() {
    const trackingDate = await this.timeOffHelper.getBoardDate(new Date());

    const results = await Database.from('company_fee_agreements')
      .count('* as total')
      .whereRaw(`fee_agreement_status_id = ? and tracking_signed_date::date = to_date(?, '${DateFormats.Basic}')`, [
        FeeAgreementStatus.Signed,
        moment(trackingDate).format(DateFormats.Basic),
      ]);

    const total = results[0].total;

    return total;
  }
}

module.exports = FeeAgreementRepository;
