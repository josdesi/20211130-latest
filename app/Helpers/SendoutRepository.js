'use strict';

//Utils
const appInsights = require('applicationinsights');
const moment = require('moment');
const Database = use('Database');
const Env = use('Env');
const { copyFile } = use('App/Helpers/FileHelper');
const { fileType, types } = use('App/Helpers/FileType');
const {
  auditFields,
  userFields,
  DateFormats,
  SendoutStatusSchemes,
  JobOrderStatusSchemes,
  CandidateStatusSchemes,
  companyType,
  SendoutTypesSchemes,
  userFilters,
  parseDateWithOffset,
  SendoutTypesEmails,
  parseBoolean,
  SendoutReminderType,
  SendoutEventType,
  activityLogTypes,
  LogTypesBySendoutStatus,
  EventTypesByStatusRefuse,
  userRoles,
  addToggler,
} = use('App/Helpers/Globals');
const { unWrapDeclinationDetails, getEventAndActivityByType, DefaultEmailSendouts } = use('App/Utils/Sendouts');
const { defaultWhereResolver, multipleFilterParser, multipleWhereResolver, positionFilterResolver } = use(
  'App/Helpers/QueryFilteringUtil'
);
const { invert, find, cloneDeep } = use('lodash');
const Event = use('Event');
const EventTypes = use('App/Helpers/Events');
const Antl = use('Antl');
const SendoutStatusSchemesKeys = invert(SendoutStatusSchemes);
const Helpers = use('Helpers');
const TimeoffHelper = use('App/Helpers/TimeoffHelper');
const SendoutMessagingHelper = use('App/Helpers/SendoutMessagingHelper');
const { ActiveFeeAmountQueryBuilder, PlacedFeeAmountQueryBuilder } = use('App/Helpers/HotSheet/FeeAmountQueryBuilder');
const { FeeAmountConditionalCopy } = use('App/Helpers/HotSheet/FeeAmountConditionalFilters');
const { SendoutDashboard, FORMAT_WEEK_DATE } = use('App/Helpers/SendoutDashboard/SendoutDashboard');

//Models
const Sendout = use('App/Models/Sendout');
const SendoutStatus = use('App/Models/SendoutStatus');
const SendoutInterview = use('App/Models/SendoutInterview');
const SendoutAttachment = use('App/Models/SendoutAttachment');
const SendoutEmailDetail = use('App/Models/SendoutEmailDetail');
const SendoutHasHiringAuthority = use('App/Models/SendoutHasHiringAuthority');
const CandidateHasFile = use('App/Models/CandidateHasFile');
const SendoutType = use('App/Models/SendoutType');
const SendoutInterviewType = use('App/Models/SendoutInterviewType');
const SendoutTemplate = use('App/Models/SendoutTemplate');
const SendoutEventLog = use('App/Models/SendoutEventLog');
const FileType = use('App/Models/FileType');

// Repositories
const UserRepository = new (use('App/Helpers/UserRepository'))();
const JobOrderRepository = new (use('App/Helpers/JobOrderRepository'))();
const RecruiterRepository = new (use('App/Helpers/RecruiterRepository'))();
const CandidateRepository = new (use('App/Helpers/CandidateRepository'))();
const HiringAuthorityRepository = new (use('App/Helpers/HiringAuthorityRepository'))();
const ModulePresetsConfigRepository = new (use('App/Helpers/ModulePresetsConfigRepository'))();

// Mail
const SendoutEmail = use('App/Emails/SendoutEmail');
const GenericSendgridTemplateEmail = new (use('App/Emails/GenericSendgridTemplateEmail'))();

const minimumForWeekLeaders = 5;
const minimumForDailyLeaders = 3;

class SendOutRepository {
  constructor() {
    this.sendoutEmail = new SendoutEmail();
    this.defaultRelations = [
      {
        relation: 'type',
      },
      {
        relation: 'status',
        extend: [
          {
            method: 'select',
            params: ['id', 'title', 'style as color'],
          },
        ],
      },
      {
        relation: 'joborder',
        load: [
          {
            relation: 'company',
            hideFields: { fields: ['industry_id', 'contact_id', 'address_id'] },
          },
          {
            relation: 'recruiter',
            extend: [
              {
                method: 'select',
                params: ['id', 'initials', 'email', ' personal_information_id'],
              },
            ],
            load: [
              {
                relation: 'personalInformation',
                extend: [
                  {
                    method: 'select',
                    params: ['id', 'full_name'],
                  },
                ],
              },
            ],
          },
          {
            relation: 'additionalRecruiters',
            load: [
              {
                relation: 'recruiter',
                extend: [
                  {
                    method: 'select',
                    params: ['id', 'initials', 'email', ' personal_information_id'],
                  },
                ],
                load: [
                  {
                    relation: 'personalInformation',
                    extend: [
                      {
                        method: 'select',
                        params: ['id', 'full_name'],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        relation: 'emailDetails',
        hideFields: { fields: ['sendout_template_id'] },
      },
      {
        relation: 'attachments',
      },
      {
        scope: 'candidate',
      },
      {
        scope: 'interviews',
      },
      {
        scope: 'hiringAuthorithies',
      },
      {
        relation: 'eventLogs',
        load: [
          {
            relation: 'user',
            hideFields: {
              fields: [...auditFields, ...userFields, 'job_title', 'manager_id'],
            },
            load: [
              {
                relation: 'personalInformation',
                extend: [
                  {
                    method: 'select',
                    params: ['id', 'full_name'],
                  },
                ],
              },
            ],
          },
          {
            relation: 'eventType',
          },
        ],
      },
      {
        scope: 'jobOrderAccountable',
      },
      {
        scope: 'candidateAccountable',
      },
    ];

    this._orderColumnsMap = {
      sent_on: 'so.created_at',
      tracking_date: 'so.tracking_date',
      candidate: 'pic.full_name',
      company: 'cp.name',
      status: 'sos.id',
      type: 'sot.id',
      industry: 'spec.industry_id',
      specialty: 'spec.id',
      functional_title: 'positions.id',
      coach: 'rejo.coach_name',
      state_name: 'cities.state_id',
      city_name: 'cities.id',
      id: 'so.id',
    };

    const bindedDefaultWhereResolver = defaultWhereResolver.bind(this);
    this._filterOptionsColumnMap = {
      regionalDirectorIds: {
        resolver: this.multipleRegionalResolver.bind(this),
        parser: multipleFilterParser,
      },
      coachIds: {
        resolver: this.multipleCoachResolver.bind(this),
        parser: multipleFilterParser,
      },
      recruiterIds: {
        resolver: this.multipleRecruiterResolver.bind(this),
        parser: multipleFilterParser,
      },

      typeId: {
        resolver: this.typesAndStatusesWhereResolver,
        column: 'sot.id',
        parser: multipleFilterParser,
      },
      statusIds: {
        resolver: this.typesAndStatusesWhereResolver,
        column: 'sos.id',
        parser: multipleFilterParser,
      },
      candidateId: { resolver: bindedDefaultWhereResolver, column: 'ca.id' },
      hiringAuthorityEmail: {
        resolver: this.applyHiringEmailFilterResolver.bind(this),
      },
      companyId: { resolver: bindedDefaultWhereResolver, column: 'cp.id' },

      industryIds: {
        column: 'spec.industry_id',
        resolver: multipleWhereResolver,
        parser: multipleFilterParser,
      },
      specialtyIds: {
        column: 'spec.id',
        resolver: multipleWhereResolver,
        parser: multipleFilterParser,
      },
      positionIds: {
        column: 'positions.id',
        resolver: positionFilterResolver,
        parser: multipleFilterParser,
      },

      countryIds: {
        column: 'cities.country_id',
        resolver: multipleWhereResolver,
        parser: multipleFilterParser,
      },
      stateIds: {
        column: 'cities.state_id',
        resolver: multipleWhereResolver,
        parser: multipleFilterParser,
      },
      cityIds: {
        column: 'cities.id',
        resolver: multipleWhereResolver,
        parser: multipleFilterParser,
      },
      zips: {
        column: 'addresses.zip',
        resolver: multipleWhereResolver,
        parser: multipleFilterParser,
      },

      start_date: {
        resolver: bindedDefaultWhereResolver,
        column: 'so.tracking_date',
        operator: '>=',
      },
      end_date: {
        resolver: bindedDefaultWhereResolver,
        column: 'so.tracking_date',
        operator: '<=',
      },
      userFilter: { resolver: this.applyUserFilterResolver.bind(this) },
    };

    this.summaryColumns = [
      {
        key: 'metrics',
        copy: '',
        rows: [
          {
            key: 'active_fees',
            type: 'normal',
            label: 'Active Fees',
            style: {
              formatter: 'currency_bold',
            },
          },
          {
            key: 'metrics',
            type: 'normal',
            label: 'Metrics',
            style: {
              formatter: 'currency_bold',
            },
          },
          {
            key: 'fees_total',
            type: 'normal',
            label: 'Fee Total',
            style: {
              formatter: 'currency_bold',
            },
          },
          {
            key: 'fee_average',
            type: 'normal',
            label: 'Average Fee',
            style: {
              formatter: 'currency_bold',
            },
          },
        ],
      },

      {
        key: 'active_sendouts',
        rows: [
          {
            key: 'total_sendouts',
            type: 'normal',
            label: 'Total Sendouts',
            style: {
              formatter: 'bold',
            },
          },
          {
            key: SendoutStatusSchemesKeys[SendoutStatusSchemes.Active],
            type: 'normal',
            label: 'Active Sendouts',
            style: {
              formatter: 'bold',
            },
          },
          {
            key: SendoutStatusSchemesKeys[SendoutStatusSchemes.NoOffer],
            type: 'normal',
            label: 'No Offer',
            style: {
              formatter: 'bold',
            },
          },
          {
            key: SendoutStatusSchemesKeys[SendoutStatusSchemes.Declined],
            type: 'normal',
            label: 'Offer Declined',
            style: {
              formatter: 'bold',
            },
          },
          {
            key: SendoutStatusSchemesKeys[SendoutStatusSchemes.Placed],
            type: 'normal',
            label: 'Placed Candidates',
            style: {
              formatter: 'bold',
            },
          },
          {
            key: 'placement_ratio',
            type: 'normal',
            label: 'Sendouts per Placement',
            style: {
              formatter: 'bold',
            },
          },
        ],
      },

      {
        key: 'inactive_sendouts',
        rows: [
          {
            key: 'total_sendovers',
            type: 'normal',
            label: 'Total Sendovers',
            style: {
              formatter: 'bold',
            },
          },
          {
            key: SendoutStatusSchemesKeys[SendoutStatusSchemes.Sendover],
            type: 'normal',
            label: 'Active Sendover',
            style: {
              formatter: 'bold',
            },
          },
          {
            key: SendoutStatusSchemesKeys[SendoutStatusSchemes.SendoverNoOffer],
            type: 'normal',
            label: 'No Offer',
            style: {
              formatter: 'bold',
            },
          },
          {
            key: SendoutStatusSchemesKeys[SendoutStatusSchemes.SendoverDeclined],
            type: 'normal',
            label: 'Offer Declined',
            style: {
              formatter: 'bold',
            },
          },
          {
            key: 'converted',
            type: 'normal',
            label: 'Converted to Sendout',
            style: {
              formatter: 'bold',
            },
          },
          {
            key: 'sendover_ratio',
            type: 'normal',
            label: 'Sendovers per Sendout',
            style: {
              formatter: 'bold',
            },
          },
        ],
      },
    ];

    this.timeOffHelper = new TimeoffHelper({
      cutoffTime: Env.get('BOARDS_CUTOFF_TIME') || '20:00',
      timezone: Env.get('BOARDS_TIMEZONE') || 'US/Central',
    });
    this.messagingHelper = new SendoutMessagingHelper();
  }

  /**
   * Returns the paginated data of sendouts
   *
   * @param {Object} request
   * @param {Integer} userId
   * @param {Integer} timezone
   *
   * @return {Object} The sendouts data
   */
  async listing(request, userId, timezone) {
    try {
      const sendouts = await this.getListing(
        request,
        userId,
        timezone,
        [
          'so.id',
          'so.tracking_date',
          'so.fee_amount',
          'ca.id as candidate_id',
          'pic.full_name as candidate_name',
          'jo.id as job_order_id',
          'cp.id as company_id',
          'cp.name as company_name',
          'sos.id as status_id',
          'sos.title as status_title',
          'sos.style as status_color',
          'sot.id as type_id',
          'sot.title as type_title',
          'sot.style as type_color',
          'rejo.initials as rec_jo_initials',
          'reca.initials as rec_ca_initials',
          'rejo.coach_name as coach',
          'spec.industry as industry',
          'spec.title as specialty',
          'positions.title as functional_title',
          'cities.id as city_id',
          'cities.title as city_name',
          'cities.state as state_name',
          'cities.state_id as state_id',
          'so.created_by',
          'so.created_at as sent_on',
          'so.converted',
        ],
        true,
        [],
        true
      );

      return {
        success: true,
        code: 200,
        data: this.withCustomFormatting(sendouts),
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      return {
        success: false,
        code: 500,
        message: Antl.formatMessage('messages.error.internalServer', {
          action: 'retrieving',
          entity: 'Hot Sheet',
        }),
      };
    }
  }

  async getListing(request, userId, timezone, columnsToSelect, withPaginate, groupBy, withOrder) {
    const { page = 1, perPage = 10, orderBy, direction, keyword, ...rest } = request;
    const query = Database.table('sendouts as so');

    query
      .select(columnsToSelect)
      .innerJoin('candidates as ca', 'so.candidate_id', 'ca.id')
      .innerJoin('personal_informations as pic', 'ca.personal_information_id', 'pic.id')
      .innerJoin('job_orders as jo', 'so.job_order_id', 'jo.id')
      .leftJoin('addresses', 'jo.address_id', 'addresses.id')
      .innerJoin('companies as cp', 'jo.company_id', 'cp.id')
      .leftJoin('v_users as rejo', 'so.job_order_accountable_id', 'rejo.id')
      .leftJoin('personal_informations as pirejo', 'pirejo.id', 'rejo.personal_information_id')
      .leftJoin('v_users as reca', 'so.candidate_accountable_id', 'reca.id')
      .leftJoin('personal_informations as pireca', 'pireca.id', 'reca.personal_information_id')
      .leftJoin('v_cities as cities', 'cp.city_id', 'cities.id')
      .innerJoin('v_specialties as spec', 'jo.specialty_id', 'spec.id')
      .innerJoin('positions', 'jo.position_id', 'positions.id')
      .innerJoin('sendout_statuses as sos', 'so.sendout_status_id', 'sos.id')
      .innerJoin('sendout_types as sot', 'so.sendout_type_id', 'sot.id');

    if (rest.userFilter && Number(rest.userFilter) === userFilters.MyInventory) {
      query
        .leftJoin('job_order_additional_recruiters as jo_ar', function () {
          this.on('jo.id', 'jo_ar.job_order_id').andOn('jo_ar.recruiter_id', userId);
        })
        .leftJoin('candidate_additional_recruiters as ca_ar', function () {
          this.on('ca.id', 'ca_ar.candidate_id').andOn('ca_ar.recruiter_id', userId);
        });
    }
    query.where('deleted', false);

    this.applyKeywordClause(keyword, query);
    await this.applyWhereClause(
      {
        ...rest,
        start_date: parseDateWithOffset(rest.start_date, timezone),
        end_date: parseDateWithOffset(rest.end_date, timezone),
      },
      query,
      userId
    );
    withOrder && this.applyOrderClause(direction, orderBy, query);
    groupBy.length > 0 && query.groupByRaw(groupBy);
    return withPaginate ? query.paginate(page, perPage) : query;
  }

  withCustomFormatting(paginatedSendouts) {
    const types = invert(SendoutTypesSchemes);

    if (paginatedSendouts.data) {
      const sendoutsList = paginatedSendouts.data;
      return {
        ...paginatedSendouts,
        data: sendoutsList.map((sendout) => ({
          ...sendout,
          status: {
            id: sendout.status_id,
            title: sendout.status_title,
            color: sendout.status_color,
          },
          type: {
            id: sendout.type_id,
            title: types[sendout.type_id],
            color: sendout.type_color,
          },
          recruiters: `${sendout.rec_jo_initials || 'NA'}/${sendout.rec_ca_initials || 'NA'}`,
          candidate: {
            id: sendout.candidate_id,
            name: sendout.candidate_name,
          },
          company: {
            id: sendout.company_id,
            name: sendout.company_name,
          },
        })),
      };
    }
    return paginatedSendouts;
  }

  applyKeywordClause(keyword, query) {
    if (keyword) {
      query.where(function () {
        this.where('cp.name', 'ilike', `%${keyword}%`)
          .orWhere('pic.full_name', 'ilike', `%${keyword}%`)
          .orWhere('rejo.initials', 'ilike', `${keyword}%`)
          .orWhere('pirejo.full_name', 'ilike', `%${keyword}%`)
          .orWhere('reca.initials', 'ilike', `${keyword}%`)
          .orWhere('pireca.full_name', 'ilike', `%${keyword}%`);
      });
    }
  }

  applyHiringEmailFilterResolver({ query, value }) {
    query.whereRaw(
      `? in (
      SELECT jsonb_array_elements_text(sed.cc_emails)
      FROM sendout_email_details AS sed
      WHERE so.sendout_email_detail_id = sed.id
    )`,
      [value]
    );
  }

  async applyUserFilterResolver({ query, user_id, value }) {
    switch (Number(value)) {
      case userFilters.Mine:
        query.where(function () {
          this.where('reca.id', user_id).orWhere('rejo.id', user_id);
        });
        break;
      case userFilters.MyTeam:
        const recruitersOnMyTeam = await RecruiterRepository.recruiterOnTeam(user_id);
        query.where(function () {
          this.whereIn(`reca.id`, recruitersOnMyTeam).orWhereIn(`rejo.id`, recruitersOnMyTeam);
        });
        break;
      case userFilters.MyInventory:
        query.where(function () {
          this.where('ca.recruiter_id', user_id)
            .orWhere('jo.recruiter_id', user_id)
            .orWhere('jo_ar.recruiter_id', user_id)
            .orWhere('ca_ar.recruiter_id', user_id)
            .orWhere('reca.id', user_id)
            .orWhere('rejo.id', user_id);
        });
        break;
      case userFilters.MyRegion:
        query.where(function () {
          this.where(`reca.regional_id`, user_id).orWhere(`rejo.regional_id`, user_id);
        });
        break;
      default:
        break;
    }
  }

  async applyWhereClause(filters, query, user_id) {
    for (const keyFilter of Object.keys(this._filterOptionsColumnMap)) {
      const filterMapEntry = this._filterOptionsColumnMap[keyFilter];
      if (!filterMapEntry) continue;
      const { resolver, column, parser, operator } = filterMapEntry;
      const value = parser instanceof Function ? parser(filters[keyFilter]) : filters[keyFilter];
      if (!value || !(resolver instanceof Function)) continue;
      await resolver({ query, column, value, user_id, operator });
    }
  }

  applyOrderClause(direction = 'asc', orderBy = 'tracking_date', query) {
    const validDirections = ['asc', 'desc'];
    const orderColumn = this._orderColumnsMap[orderBy];
    const orderDirection =
      validDirections.find((dir) => dir.toLowerCase() === direction.toLowerCase()) || validDirections[0];
    query.orderByRaw(`${orderColumn} ${orderDirection} NULLS LAST`);
  }

  async multipleRegionalResolver({ query, value }) {
    const regionalDirectorIds = value;
    const whereInClauseRecruiters = regionalDirectorIds.map((regionalId) => Number(regionalId));

    query.where(function () {
      this.whereIn(`rejo.regional_id`, whereInClauseRecruiters).orWhereIn('reca.regional_id', whereInClauseRecruiters);
    });
  }

  async multipleCoachResolver({ query, value }) {
    const coachIds = value;
    const whereInClauseRecruiters = coachIds.map((coachId) => Number(coachId));

    query.where(function () {
      this.whereIn(`rejo.coach_id`, whereInClauseRecruiters).orWhereIn('reca.coach_id', whereInClauseRecruiters);
    });
  }

  multipleRecruiterResolver({ query, value }) {
    query.where(function () {
      this.whereIn('job_order_accountable_id', value).orWhereIn('candidate_accountable_id', value);
    });
  }

  typesAndStatusesWhereResolver({ query, column, value }) {
    query.whereIn(column, value);
  }

  /**
   *
   * Creation of the Sendout or Sendover based on its type,
   * Send or not send email to hiring authority by type and and if shipping is allowed,
   * Send notification email to OPS and distribution lists,
   * Send reminders based on its interviews
   *
   * Returns a custom response that determines the creation of a sendout or sendover.
   *
   * @param {Object} req
   * @param {Integer} userId
   * @param {String} timezone
   *
   * @return {Object} A success with a code 200 and message or a message error with an error code
   */
  async create(req, userId, timezone) {
    const {
      type_id,
      status_id,
      job_order_id,
      candidate_id,
      fee_amount,
      attachments,
      interviews,
      hiring_authorities,
      hiring_authority,
      declination_details,
      send_email,
      company_id,
      job_order_accountable_id,
      company_owner_id,
      candidate_accountable_id,
      candidate_owner_id,
      cc_emails,
      bcc_emails,
      template_id,
      subject,
      template,
    } = req;

    req['timezone'] = timezone;

    let trx;

    const allowSendEmail = parseBoolean(send_email);
    const typeId = type_id;
    const statusId = status_id;

    const isSendoutActive = statusId === SendoutStatusSchemes.Active;
    const isSendoverActive = statusId === SendoutStatusSchemes.Sendover;

    const jobOrderAccountableId = job_order_accountable_id || company_owner_id;
    const candidateAccountableId = candidate_accountable_id || candidate_owner_id;

    const eventAndActivity = getEventAndActivityByType(typeId);

    try {
      trx = await Database.beginTransaction();

      const baseEmailDetails = { cc_emails, bcc_emails, template_id, subject, template };
      const emailDetails = await this.createEmailDetails(baseEmailDetails, userId, trx);
      const declinationDetails =
        isSendoverActive && declination_details && unWrapDeclinationDetails(declination_details);

      const trackingDate = moment().format(DateFormats.SystemDefault);
      const boardDate = await this.timeOffHelper.getBoardDate(new Date());

      const sendout = await Sendout.create(
        {
          sendout_type_id: typeId,
          sendout_status_id: statusId,
          candidate_id,
          job_order_id,
          fee_amount,
          sendout_email_detail_id: emailDetails.id,
          tracking_date: trackingDate,
          board_date: boardDate,
          declination_details: declinationDetails,
          send_email_hiring: allowSendEmail,
          job_order_accountable_id: jobOrderAccountableId,
          candidate_accountable_id: candidateAccountableId,
          created_by: userId,
          updated_by: userId,
        },
        trx
      );

      const sendoutId = sendout.id;

      const newAttachments = await this.createAttachments(attachments, sendoutId, trx);
      await this.createHiringAuthorities(hiring_authorities, sendoutId, userId, trx);
      const newInterviews =
        isSendoutActive && interviews ? await this.createInterviews(interviews, sendoutId, userId, trx) : [];

      let eventData = {
        sendout_id: sendoutId,
        triggered_by_user_id: userId,
        event_type_id: eventAndActivity.eventId,
        event_details: {
          sendout,
          email_details: emailDetails,
          declination_details: declinationDetails,
          interviews: newInterviews,
          attachments: newAttachments,
        },
      };

      await SendoutEventLog.create(eventData, trx);

      await this.updateJobOrderStatus(sendout, statusId, userId, trx);
      await this.updateCandidateStatus(sendout, statusId, userId, trx);

      const emailData = {
        jobOrderId: job_order_id,
        candidateId: candidate_id,
        jobOrderAccountableId,
        candidateAccountableId,
        hiringAuthority: hiring_authority,
        ccEmails: cc_emails,
        bccEmails: bcc_emails,
        subject: subject,
        template: template,
        userId,
      };

      let emailResponse;
      if ((isSendoutActive || isSendoverActive) && allowSendEmail) {
        emailResponse = await this.sendoutEmail.createAndSendEmailToHiringAuthority(
          emailData,
          newInterviews,
          newAttachments
        );
      }

      if (emailResponse && emailResponse.success) {
        eventData = {
          sendout_id: sendoutId,
          event_type_id: SendoutEventType.EmailSentToHiringAuthority,
          triggered_by_user_id: userId,
          event_details: {
            email_details: emailData,
            newAttachments,
            newInterviews,
          },
        };

        await SendoutEventLog.create(eventData, trx);
      }

      if (emailResponse && !emailResponse.success) {
        trx && (await trx.rollback());
        throw emailResponse.message || `Unexpected error while sending email to Hiring Authority`;
      }

      trx && (await trx.commit());

      const sendoutDetails = await this.details(sendoutId, this.defaultRelations);

      //TODO remove with event
      await this.createRemindersAndCreateEmail(
        sendoutId,
        statusId,
        req,
        newInterviews,
        newAttachments,
        userId,
        allowSendEmail
      );

      const jobOrder = await sendout.joborder().fetch();

      const payloadActivityLog = {
        typeId: sendout.sendout_type_id,
        statusId: sendout.sendout_status_id,
        logTypeId: eventAndActivity.logId,
        companyId: jobOrder.company_id || company_id,
        jobOrderId: sendout.job_order_id,
        candidateId: sendout.candidate_id,
        sendoutId: sendoutId,
        interviews,
        declinationDetails: declination_details,
        timezone,
        userId: jobOrderAccountableId,
      };

      if (!Helpers.isAceCommand()) {
        Event.fire(EventTypes.Sendout.Created, {
          candidateId: sendout.candidate_id,
          jobOrderId: sendout.job_order_id,
          userId,
          payloadActivityLog,
        });
      }

      return {
        success: true,
        code: 201,
        data: sendoutDetails,
        message: Antl.formatMessage('messages.success.creation', { entity: eventAndActivity.message }),
      };
    } catch (error) {
      trx && (await trx.rollback());

      const properties = {
        type_id,
        status_id,
        job_order_id,
        candidate_id,
        job_order_accountable_id,
        candidate_accountable_id,
      };

      appInsights.defaultClient.trackEvent({ name: 'Sendout Failed', properties });
      appInsights.defaultClient.trackException({ exception: error });

      return {
        success: false,
        code: 500,
        title: Antl.formatMessage('messages.error.sendout.creation.title', { entity: eventAndActivity.message }),
        message: error || Antl.formatMessage('messages.error.sendout.message'),
      };
    }
  }

  /**
   *
   * Update Sendover or Sendout,
   *
   * Returns a custom response that determines the update of a sendout or sendover.
   *
   * @param {Object} params
   * @param {Object} req
   * @param {Integer} userId
   * @param {String} timezone
   *
   * @return {Object} A success with a code 200 and message or a message error with an error code
   */
  async update(params, req, userId, timezone) {
    let trx;

    const {
      status_id,
      updated_interviews,
      interviews,
      declination_details,
      attachments,
      send_email,
      fee_amount,
      company_id,
      job_order_accountable_id,
      company_owner_id,
      candidate_accountable_id,
      candidate_owner_id,
      hiring_authority,
      cc_emails,
      bcc_emails,
      subject,
      template,
    } = req;

    req['timezone'] = timezone;

    const sendout = await Sendout.find(params.id);

    if (!sendout) {
      return {
        success: false,
        code: 404,
        message: Antl.formatMessage('messages.error.notFound', {
          entity: 'Sendout',
        }),
      };
    }

    try {
      trx = await Database.beginTransaction();

      const sendoutId = sendout.id;
      const allowSendEmail = parseBoolean(send_email);
      const statusId = status_id;
      const currentStatus = sendout.sendout_status_id;
      const currentAllowSendEmail = sendout.send_email_hiring;
      const currentFeeAmount = sendout.fee_amount;

      const jobOrderAccountableIdTemp = job_order_accountable_id || company_owner_id;
      const jobOrderAccountableId =
        sendout.job_order_accountable_id === jobOrderAccountableIdTemp
          ? sendout.job_order_accountable_id
          : jobOrderAccountableIdTemp;
      if (sendout.job_order_accountable_id !== jobOrderAccountableIdTemp) {
        await this.createHistoryLogAccountableChange(
          {
            sendoutId: sendoutId,
            userId: userId,
            oldAccountableId: sendout.job_order_accountable_id,
            newAccountableId: jobOrderAccountableIdTemp,
            eventType: SendoutEventType.JobOrderAccountableEdited,
          },
          trx
        );
      }

      const candidateAccountableIdTemp = candidate_accountable_id || candidate_owner_id;
      const candidateAccountableId =
        sendout.candidate_accountable_id === candidateAccountableIdTemp
          ? sendout.candidate_accountable_id
          : candidateAccountableIdTemp;
      if (sendout.candidate_accountable_id !== candidateAccountableIdTemp) {
        await this.createHistoryLogAccountableChange(
          {
            sendoutId: sendoutId,
            userId: userId,
            oldAccountableId: sendout.candidate_accountable_id,
            newAccountableId: candidateAccountableIdTemp,
            eventType: SendoutEventType.CandidateAccountableEdited,
          },
          trx
        );
      }

      const jobOrder = await sendout.joborder().fetch();

      let payloadActivityLog = {
        typeId: sendout.sendout_type_id,
        statusId: sendout.sendout_status_id,
        companyId: jobOrder.company_id || company_id,
        jobOrderId: sendout.job_order_id,
        candidateId: sendout.candidate_id,
        sendoutId: sendout.id,
        userId: jobOrderAccountableId,
        timezone,
      };

      const baseEventData = {
        sendout_id: sendoutId,
        triggered_by_user_id: userId,
      };

      if (allowSendEmail && !currentAllowSendEmail) sendout.merge({ send_email_hiring: allowSendEmail });
      if (currentStatus != statusId) {
        sendout.merge({ sendout_status_id: statusId, updated_by: userId });

        if (EventTypesByStatusRefuse[statusId] && declination_details) {
          const declinationDetails = unWrapDeclinationDetails(declination_details);
          sendout.merge({ declination_details: declinationDetails });

          const eventData = {
            ...baseEventData,
            event_type_id: EventTypesByStatusRefuse[statusId],
            event_details: declinationDetails,
          };

          await SendoutEventLog.create(eventData, trx);
        } else if (statusId === SendoutStatusSchemes.Placed) {
          const eventData = {
            ...baseEventData,
            event_type_id: SendoutEventType.SendoutPlaced,
            event_details: { statusId },
          };

          await SendoutEventLog.create(eventData, trx);
        }
        if (LogTypesBySendoutStatus[statusId]) {
          payloadActivityLog = {
            ...payloadActivityLog,
            logTypeId: LogTypesBySendoutStatus[statusId],
            declinationDetails: declination_details,
          };
        }

        await this.updateJobOrderStatus(sendout, statusId, userId, trx);
        await this.updateCandidateStatus(sendout, statusId, userId, trx);
      }

      sendout.merge({
        fee_amount,
        job_order_accountable_id: jobOrderAccountableId,
        candidate_accountable_id: candidateAccountableId,
      });

      await sendout.save(trx);

      if (fee_amount !== currentFeeAmount && sendout.sendout_type_id === SendoutTypesSchemes.Sendout) {
        const eventData = {
          ...baseEventData,
          event_type_id: SendoutEventType.FeeAmountEditionPlaced,
          event_details: {
            tags: {
              fee_old: currentFeeAmount,
              fee_new: fee_amount,
            },
            format: 'currency',
          },
        };
        await SendoutEventLog.create(eventData, trx);
      }

      if (statusId != SendoutStatusSchemes.Active) {
        this.deleteReminders(sendoutId, userId);

        const eventData = {
          ...baseEventData,
          event_type_id: SendoutEventType.DeleteReminders,
          event_details: null,
        };

        await SendoutEventLog.create(eventData, trx);
      } else if (statusId === SendoutStatusSchemes.Active) {
        let allInterviews = [];
        let allAttachments = [];

        if (updated_interviews && !!updated_interviews.length) {
          await this.updateInterviews(sendoutId, updated_interviews, req, userId, trx);
          allInterviews.push(...updated_interviews);
        }
        if (interviews && !!interviews.length) {
          const newInterviews = await this.createInterviews(interviews, sendoutId, userId, trx);
          allInterviews.push(...newInterviews);

          const eventData = {
            ...baseEventData,
            event_type_id: SendoutEventType.NewReminders,
            event_details: newInterviews,
          };

          await SendoutEventLog.create(eventData, trx);

          // TODO move this logic with event
          await this.createReminders(sendoutId, newInterviews, req, userId, true);

          payloadActivityLog = {
            ...payloadActivityLog,
            logTypeId: activityLogTypes.Interview,
            interviews,
          };
        }

        if (allowSendEmail && !currentAllowSendEmail) {
          if (attachments && !attachments.length && attachments.candidate) {
            allAttachments.push(...attachments.candidate);
          }
          if (allInterviews && allInterviews.length === 0) {
            const data = await SendoutInterview.query().where('sendout_id', sendoutId).fetch();
            const dataJson = data.toJSON();
            allInterviews.push(...dataJson);
          }

          allInterviews = allInterviews.sort((a, b) => a.id - b.id)[0];

          const emailData = {
            jobOrderId: sendout.job_order_id,
            candidateId: sendout.candidate_id,
            jobOrderAccountableId,
            candidateAccountableId,
            hiringAuthority: hiring_authority,
            ccEmails: cc_emails,
            bccEmails: bcc_emails,
            subject: subject,
            template: template,
            userId,
          };

          let emailResponse = await this.sendoutEmail.createAndSendEmailToHiringAuthority(
            emailData,
            allInterviews,
            allAttachments
          );

          if (emailResponse && !emailResponse.success) {
            trx && (await trx.rollback());
            throw emailResponse.message || `Unexpected error while sending email to hiring authority`;
          }

          const eventData = {
            ...baseEventData,
            event_type_id: SendoutEventType.EmailSentToHiringAuthority,
            event_details: {
              email_details: emailData,
              allInterviews,
              allAttachments,
            },
          };

          await SendoutEventLog.create(eventData, trx);
        }
      }

      trx && (await trx.commit());

      const sendoutDetails = await this.details(sendoutId, this.defaultRelations);

      if (!Helpers.isAceCommand()) {
        if (payloadActivityLog && payloadActivityLog.logTypeId) {
          Event.fire(EventTypes.Sendout.Updated, {
            candidateId: sendout.candidate_id,
            jobOrderId: sendout.job_order_id,
            userId,
            payloadActivityLog,
          });
        }
      }

      return {
        success: true,
        code: 201,
        data: sendoutDetails,
        message: Antl.formatMessage('messages.success.update', {
          entity: 'Sendout',
        }),
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      trx && (await trx.rollback());

      return {
        success: false,
        code: 500,
        message: Antl.formatMessage('messages.error.internalServer', {
          action: 'updating',
          entity: 'Sendout',
        }),
      };
    }
  }

  /**
   * Create history log to sendout when change accountables
   *
   * @param sendoutId
   * @param userId
   * @param oldAccountableId
   * @param newAccountableId
   * @param eventType
   * @param trx
   */
  async createHistoryLogAccountableChange({ sendoutId, userId, oldAccountableId, newAccountableId, eventType }, trx) {
    const oldAccountable = await UserRepository.getDetails(oldAccountableId);
    const newAccountable = await UserRepository.getDetails(newAccountableId);

    const eventData = {
      sendout_id: sendoutId,
      triggered_by_user_id: userId,
      event_type_id: eventType,
      event_details: {
        tags: {
          accountable_old: oldAccountable.full_name,
          accountable_new: newAccountable.full_name,
        },
      },
    };

    await SendoutEventLog.create(eventData, trx);
  }

  async createReminders(sendoutId, interviews, sendoutData, userId, sendFirstReminder) {
    for (const interview of interviews) {
      if (!interview.interview_schedule) {
        await this.createReminderToHiringAuthority(sendoutId, interview, sendoutData, userId, sendFirstReminder);
        await this.createReminderToCandidate(sendoutId, interview, sendoutData, userId, sendFirstReminder);
        await this.createReminderToJobOrderRecruiter(sendoutId, interview, sendoutData, userId, sendFirstReminder);
        await this.createReminderToCandidateRecruiter(sendoutId, interview, sendoutData, userId, sendFirstReminder);

        const eventData = {
          sendout_id: sendoutId,
          triggered_by_user_id: userId,
          event_type_id: SendoutEventType.InterviewRemindersScheduled,
          event_details: interviews,
        };

        await SendoutEventLog.create(eventData);
      }
    }
  }

  async details(id, relationsToInclude) {
    const sendout = await Sendout.query()
      .hideFields({
        fields: ['sendout_type_id', 'sendout_status_id', 'sendout_email_detail_id'],
      })
      .include(relationsToInclude)
      .where({ id })
      .first();

    if (!sendout) {
      return;
    }

    const sendoutJSON = sendout.toJSON();

    const jobOrderCoach = await RecruiterRepository.getCoachInfoByRecruiterId(sendoutJSON.job_order_accountable_id);
    const candidateCoach = await RecruiterRepository.getCoachInfoByRecruiterId(sendoutJSON.candidate.recruiter.id);

    sendoutJSON.joborder = {
      ...sendoutJSON.joborder,
      coach: jobOrderCoach,
    };

    sendoutJSON.candidate = {
      ...sendoutJSON.candidate,
      coach: candidateCoach,
    };
    const additionalsRecruiters = sendoutJSON.joborder.additionalRecruiters;
    const newAdditionals = await this.insertCoachToRecruiters(additionalsRecruiters);
    sendoutJSON.joborder.additionalRecruiters = newAdditionals;

    return sendoutJSON;
  }

  async insertCoachToRecruiters(additionalRecuirters = []) {
    const additionalsWithCoach = additionalRecuirters.map(async (rcr) => {
      const coach = await RecruiterRepository.getCoachInfoByRecruiterId(rcr.recruiter_id);
      return {
        ...rcr,
        coach: coach,
      };
    });

    return Promise.all(additionalsWithCoach);
  }

  /**
   *
   * @param {Object} email
   * @param {Integer} userId
   * @param {*} trx
   * @returns {Object} email details
   */
  async createEmailDetails(email, userId, trx) {
    const { cc_emails, bcc_emails, template_id, subject, template } = email;
    const response = await SendoutEmailDetail.create(
      {
        cc_emails,
        bcc_emails,
        sendout_template_id: template_id,
        subject,
        template,
        created_by: userId,
        updated_by: userId,
      },
      trx
    );

    return response;
  }

  /**
   *
   * @param {Array} attachments
   * @param {Integer} sendoutId
   * @param {*} trx
   * @returns {Array} attachments
   */
  async createAttachments(attachments, sendoutId, trx) {
    const newAttachments = [];

    if (attachments && attachments.candidate) {
      for (const attachment of attachments.candidate) {
        const file = await CandidateHasFile.find(attachment.id);
        const fileCopyResult = await copyFile(file.url, `attachments/sendouts/${sendoutId}`, file.file_name);
        if (!fileCopyResult.success) {
          throw fileCopyResult.error;
        }

        newAttachments.push(
          await SendoutAttachment.create(
            {
              sendout_id: sendoutId,
              file_type_id: await fileType('ATTACHMENT'),
              url: fileCopyResult.url,
              file_name: file.file_name,
              size: file.size ? file.size : attachment.size,
            },
            trx
          )
        );
      }
    }

    return newAttachments;
  }

  /**
   *
   * @param {Array} hiringAuthorities
   * @param {Integer} sendoutId
   * @param {Integer} userId
   * @param {*} trx
   * @returns  {Array} hiring authorities
   */
  async createHiringAuthorities(hiringAuthorities, sendoutId, userId, trx) {
    const newHiringAuthorities = [];

    for (const hiringAuthority of hiringAuthorities) {
      newHiringAuthorities.push(
        await SendoutHasHiringAuthority.create(
          {
            sendout_id: sendoutId,
            hiring_authority_id: hiringAuthority.id,
            created_by: userId,
            updated_by: userId,
          },
          trx
        )
      );
    }

    return newHiringAuthorities;
  }

  /**
   *
   * @param {Array} interviews
   * @param {Integer} sendoutId
   * @param {Inteer} userId
   * @param {*} trx
   * @returns {Array} interviews
   */
  async createInterviews(interviews, sendoutId, userId, trx) {
    const newInterviews = [];

    for (const interview of interviews) {
      newInterviews.push(
        await SendoutInterview.create(
          {
            sendout_id: sendoutId,
            sendout_interview_type_id: interview.interview_type_id,
            interview_date: interview.interview_date,
            interview_time_zone: interview.interview_time_zone,
            interview_range: interview.interview_range,
            interview_schedule: interview.interview_schedule,
            created_by: userId,
            updated_by: userId,
            email: interview.email,
            full_name: interview.full_name,
            cc_emails: interview.cc_emails,
          },
          trx
        )
      );
    }

    return newInterviews;
  }

  async updateInterviews(sendoutId, interviews, sendoutData, userId, trx) {
    for (const interview of interviews) {
      const {
        id,
        interview_date,
        interview_type_id,
        interview_time_zone,
        cc_emails,
        full_name,
        email,
        interview_range,
        interview_schedule,
      } = interview;

      await SendoutInterview.query()
        .where('id', id)
        .update(
          {
            interview_date,
            sendout_interview_type_id: interview_type_id,
            interview_time_zone,
            interview_range: interview_range || null,
            interview_schedule,
            updated_by: userId,
            email,
            full_name,
            cc_emails: JSON.stringify(cc_emails),
          },
          trx
        );

      const eventData = {
        sendout_id: sendoutId,
        triggered_by_user_id: userId,
        event_type_id: SendoutEventType.UpdateReminders,
        event_details: interviews,
      };

      await SendoutEventLog.create(eventData, trx);

      this.deleteReminderById(interview.id, userId);

      await this.createReminders(sendoutId, interviews, sendoutData, userId, false);
    }
  }

  /**
   *
   * @param {*} sendoutId
   * @param {*} statusId
   * @param {*} sendoutData
   * @param {*} interviews
   * @param {*} attachments
   * @param {*} userId
   * @param {*} sendMailToHA
   */
  async createRemindersAndCreateEmail(sendoutId, statusId, sendoutData, interviews, attachments, userId, sendMailToHA) {
    if (statusId === SendoutStatusSchemes.Active) {
      await this.createEmailToOperationsSendout(sendoutId, interviews[0], sendoutData, userId);
      await this.createReminders(sendoutId, interviews, sendoutData, userId, false);
    } else if (statusId === SendoutStatusSchemes.Sendover) {
      await this.createEmailToOperationsSendover(sendoutId, sendoutData, userId);
    }
  }

  async getPayloadOperation(sendout, interview, userId) {
    const {
      send_email,
      job_order_id,
      candidate_id,
      hiring_authority,
      job_order_accountable_id,
      company_owner_id,
      candidate_accountable_id,
      candidate_owner_id,
      type_id,
    } = sendout;

    const { date, offset } = interview;
    const allowSendEmail = parseBoolean(send_email);

    const user = await UserRepository.getDetails(userId);
    const joborder = await JobOrderRepository.details(job_order_id, 'compact');
    const candidate = await CandidateRepository.details(candidate_id, 'compact');

    const companyOwnerId = job_order_accountable_id || company_owner_id;
    const companyOwner = await UserRepository.getDetails(companyOwnerId);
    const companyCoach = await RecruiterRepository.getCoachInfoByRecruiterId(companyOwnerId);

    const candidateOwnerId = candidate_accountable_id || candidate_owner_id;
    const candidateOwner = await UserRepository.getDetails(candidateOwnerId);
    const candidateCoach = await RecruiterRepository.getCoachInfoByRecruiterId(candidateOwnerId);

    const payload = {
      date: date,
      timezone: offset,
      joborder: joborder ? joborder.title : '',
      company: joborder ? joborder.company.name : '',
      hiring_authority: hiring_authority.full_name || '',
      candidate: candidate ? candidate.personalInformation.full_name : '',
      company_recruiter: companyOwner != null ? companyOwner.full_name : joborder.recruiter.full_name,
      company_recruiter_initials: companyOwner != null ? companyOwner.initials : joborder.recruiter.initials,
      company_coach: companyCoach ? companyCoach.full_name : '',
      candidate_recruiter: candidateOwner != null
        ? candidateOwner.full_name
        : candidate.recruiter.personalInformation.full_name,
      candidate_recruiter_initials: candidateOwner != null ? candidateOwner.initials : candidate.recruiter.initials,
      candidate_coach: candidateCoach ? candidateCoach.full_name : '',
    };

    let industryEmails = [];
    joborder &&
      joborder.specialty &&
      joborder.specialty.industry &&
      joborder.specialty.industry.email &&
      industryEmails.push(joborder.specialty.industry.email);
    candidate &&
      candidate.specialty &&
      candidate.specialty.industry &&
      candidate.specialty.industry.email &&
      industryEmails.push(candidate.specialty.industry.email);

    let teamEmails = [];
    companyCoach && companyCoach.email_team && teamEmails.push(companyCoach.email_team);
    candidateCoach && candidateCoach.email_team && teamEmails.push(candidateCoach.email_team);

    const recruiterEmails = [companyOwner ? companyOwner.email: null, candidateOwner ? candidateOwner.email: null];

    let bccEmails = [DefaultEmailSendouts.Sendouts, ...industryEmails, ...teamEmails, ...recruiterEmails];

    bccEmails = bccEmails.map((email) => email.toLowerCase());
    bccEmails = bccEmails.filter((v, i) => bccEmails.indexOf(v) === i);

    const subject =
      type_id === SendoutTypesSchemes.Sendout
        ? `New Sendout of ${payload.candidate}`
        : `New Sendover of ${payload.candidate}`;

    let distributionEmails = {};

    if (type_id === SendoutTypesSchemes.Sendout) {
      distributionEmails = {
        subject: subject,
        to: DefaultEmailSendouts.Operations,
        bcc: allowSendEmail ? DefaultEmailSendouts.Sendouts : bccEmails,
        ...payload,
      };
    } else {
      distributionEmails = {
        subject: subject,
        to: DefaultEmailSendouts.Operations,
        bcc: bccEmails,
        ...payload,
      };
    }

    let bccEmailsTest = bccEmails.filter((email) => DefaultEmailSendouts.TestEmails.includes(email));
    bccEmailsTest = bccEmailsTest.filter((email) => email !== user.email);

    const distributionEmailsTest = allowSendEmail
      ? {
          subject: subject,
          to: user.email,
          ...payload,
        }
      : {
          subject: subject,
          to: user.email,
          bcc: bccEmailsTest,
          ...payload,
        };

    return Env.get('SENDOUT_REMINDER') === 'prod' ? distributionEmails : distributionEmailsTest;
  }

  async createEmailToOperationsSendout(sendoutId, interview, req, userId) {
    const { interview_date, interview_time_zone, interview_range } = interview;
    const timezone = req.timezone;

    let date = moment(interview_date).format(
      interview_range ? DateFormats.OnlyDateMonthDayYear : DateFormats.DateSendout
    );
    date = interview_range ? `${date} - ${this.dateRangeFormat(interview_range, timezone)}` : date;

    const offset = this.getTimezoneByName(interview_time_zone);
    const payload = await this.getPayloadOperation(req, { date, offset }, userId);

    await this.sendoutEmail.sendPersonalizedEmail(payload, SendoutTypesEmails.SendoutNotification);

    const eventData = {
      sendout_id: sendoutId,
      triggered_by_user_id: userId,
      event_type_id: SendoutEventType.EmailSentToOps,
      event_details: payload,
    };

    await SendoutEventLog.create(eventData);
  }

  async createEmailToOperationsSendover(sendoutId, req, userId) {
    const date = moment().format('MM-DD-YY');
    const offset = '';
    const payload = await this.getPayloadOperation(req, { date, offset }, userId);

    await this.sendoutEmail.sendPersonalizedEmail(payload, SendoutTypesEmails.SendoverNotification);

    const eventData = {
      sendout_id: sendoutId,
      triggered_by_user_id: userId,
      event_type_id: SendoutEventType.EmailSentToOps,
      event_details: payload,
    };

    await SendoutEventLog.create(eventData);
  }

  async getPayloadReminder(sendout, interview, userFullName) {
    const { hiring_authority, company_name, candidate_full_name, coach_name } = sendout;
    const { full_name, interview_date, interview_time_zone, interview_type_id, sendout_interview_type_id } = interview;
    const interviewTypeId = interview_type_id || sendout_interview_type_id;

    const hiringAuthority = full_name ? full_name : hiring_authority.full_name;
    const interviewType = await SendoutInterviewType.findBy('id', interviewTypeId);

    const date = moment(interview_date).format(DateFormats.DateSendout);
    const offset = this.getTimezoneByName(interview_time_zone);

    return {
      date: date,
      timezone: offset,
      interview_type: interviewType.title,
      company: company_name,
      hiring_authority: hiringAuthority,
      candidate: candidate_full_name,
      recruiter: userFullName,
      coach: coach_name,
    };
  }

  async createReminderToHiringAuthority(sendoutId, interview, req, userId, newReminder) {
    const reminders = this.getDiffTimeReminder(interview, false);
    const { email, cc_emails } = interview;
    const { hiring_authority } = req;

    if (reminders.length > 0) {
      const user = await UserRepository.getDetails(userId);
      const reminderReceiver = email ? email : hiring_authority.work_email || hiring_authority.personal_email;

      const payloadReminder = await this.getPayloadReminder(req, interview, user.full_name);
      const payload =
        Env.get('SENDOUT_REMINDER') === 'prod'
          ? {
              to: reminderReceiver,
              cc: cc_emails,
              ...payloadReminder,
              type: SendoutReminderType.HiringAuthority,
            }
          : {
              to: user.email,
              ...payloadReminder,
              type: SendoutReminderType.HiringAuthority,
            };

      if (newReminder) await this.sendoutEmail.sendPersonalizedEmail(payload, SendoutTypesEmails.Sendout);

      this.createReminder(sendoutId, payload, reminders, userId, SendoutEventType.CreatedReminderToHiringAuthority);
    }
  }

  async createReminderToCandidate(sendoutId, interview, req, userId, newReminder) {
    const reminders = this.getDiffTimeReminder(interview, true);

    if (reminders.length > 0) {
      const user = await UserRepository.getDetails(userId);

      const payloadReminder = await this.getPayloadReminder(req, interview, user.full_name);
      const payload =
        Env.get('SENDOUT_REMINDER') === 'prod'
          ? {
              to: req.candidate_email,
              ...payloadReminder,
              type: SendoutReminderType.Candidate,
            }
          : {
              to: user.email,
              ...payloadReminder,
              type: SendoutReminderType.Candidate,
            };

      if (newReminder) await this.sendoutEmail.sendPersonalizedEmail(payload, SendoutTypesEmails.Sendout);

      this.createReminder(sendoutId, payload, reminders, userId, SendoutEventType.CreatedReminderToCandidate);
    }
  }

  async createReminderToJobOrderRecruiter(sendoutId, interview, req, userId, newReminder) {
    const reminders = this.getDiffTimeReminder(interview, true);

    if (reminders.length > 0) {
      const user = await UserRepository.getDetails(userId);

      const payloadReminder = await this.getPayloadReminder(req, interview, user.full_name);
      const payload = {
        to: user.email,
        ...payloadReminder,
        type: SendoutReminderType.JobOrderRecruiter,
      };

      if (newReminder) await this.sendoutEmail.sendPersonalizedEmail(payload, SendoutTypesEmails.Sendout);

      this.createReminder(sendoutId, payload, reminders, userId, SendoutEventType.CreatedReminderToJobOrderRecruiter);
    }
  }

  async createReminderToCandidateRecruiter(sendoutId, interview, req, userId, newReminder) {
    const reminders = this.getDiffTimeReminder(interview, true);

    if (reminders.length > 0) {
      const user = await UserRepository.getDetails(userId);
      const joborder = await JobOrderRepository.details(req.job_order_id, 'compact');
      const emailRecruiterJO = joborder.recruiter.email;
      const candidate = await CandidateRepository.details(req.candidate_id, 'compact');
      const emailTo = candidate.recruiter.email;

      const payloadReminder = await this.getPayloadReminder(req, interview, user.full_name);
      const payload =
        Env.get('SENDOUT_REMINDER') === 'prod'
          ? {
              to: emailTo,
              ...payloadReminder,
              type: SendoutReminderType.CandidateRecruiter,
            }
          : {
              to: user.email,
              ...payloadReminder,
              type: SendoutReminderType.CandidateRecruiter,
            };

      if (emailTo !== emailRecruiterJO) {
        if (newReminder) await this.sendoutEmail.sendPersonalizedEmail(payload, SendoutTypesEmails.Sendout);

        this.createReminder(
          sendoutId,
          payload,
          reminders,
          userId,
          SendoutEventType.CreatedReminderToCandidateRecruiter
        );
      }
    }
  }

  dateRangeFormat = ({ from, to }, timezone) => {
    const fromTime = moment(from).add(timezone, 'hours');
    const toTime = moment(to).add(timezone, 'hours');

    return `${fromTime.format(DateFormats.OnlyTime)} - ${toTime.format(DateFormats.OnlyTime)}`;
  };

  getTimezoneByName(timeZone) {
    const zoneName = timeZone.split('/')[1];

    return `${zoneName[0]}ST`.toUpperCase();
  }

  getDiffTimeReminder(interview, allReminders) {
    const reminders = [];
    const tz = moment.tz.guess();
    const currentDate = moment().format(DateFormats.AgendaFormat);
    const interviewDate = moment
      .tz(interview.interview_date, interview.interview_time_zone)
      .format(DateFormats.AgendaFormat);
    const currenDateTz = moment(interviewDate).tz(tz).format(DateFormats.AgendaFormat);

    const diffTimeReminder = moment(currenDateTz).diff(currentDate, 'hours');

    if (allReminders && diffTimeReminder >= 24) {
      reminders.push({
        id: interview.id,
        date: moment(interviewDate).tz(tz).subtract(1, 'days').format(DateFormats.AgendaFormat),
        diff: 24,
      });
      reminders.push({
        id: interview.id,
        date: moment(interviewDate).tz(tz).subtract(1, 'hours').format(DateFormats.AgendaFormat),
        diff: 1,
      });
    } else if (diffTimeReminder > 0 && diffTimeReminder < 24) {
      reminders.push({
        id: interview.id,
        date: moment(interviewDate).tz(tz).subtract(1, 'hours').format(DateFormats.AgendaFormat),
        diff: 1,
      });
    }

    return reminders;
  }

  createReminder(sendoutId, payload, reminders, userId, eventTypeId) {
    Event.fire(EventTypes.Sendout.CreateReminder, {
      sendoutId,
      payload,
      reminders,
      userId,
      eventTypeId,
    });
  }

  deleteReminders(sendoutId, userId) {
    Event.fire(EventTypes.Sendout.DeleteReminder, {
      sendoutId,
      userId,
    });
  }

  deleteReminderById(interviewId, userId) {
    Event.fire(EventTypes.Sendout.DeleteReminderById, {
      interviewId,
      userId,
    });
  }

  async determineEntityStatus(sendoutId, statusId, whereClause) {
    if (statusId === SendoutStatusSchemes.Placed) return SendoutStatusSchemes.Placed;

    const sendouts = await Sendout.query().where(whereClause).fetch();
    const jsonSendouts = sendouts.toJSON();

    if (jsonSendouts && jsonSendouts.length === 0) return statusId;

    if (jsonSendouts){
        let prevSendouts = jsonSendouts.filter((sendout) => sendout.id !== sendoutId);
          prevSendouts = prevSendouts.filter(
            (sendout) =>
              sendout.sendout_status_id !== SendoutStatusSchemes.Declined &&
              sendout.sendout_status_id !== SendoutStatusSchemes.NoOffer
          );

          for (let status in SendoutStatusSchemes) {
            if (statusId === SendoutStatusSchemes[status] || this.checkStatus(prevSendouts, SendoutStatusSchemes[status])) {
              const hasSendover = prevSendouts.filter(
                (sendout) => sendout.sendout_status_id === SendoutStatusSchemes.Sendover
              );
              const hasActive = prevSendouts.filter((sendout) => sendout.sendout_status_id === SendoutStatusSchemes.Active);

              if (hasSendover && hasSendover.length > 0 && statusId !== SendoutStatusSchemes.Active)
                return SendoutStatusSchemes.Sendover;
              if (hasActive && hasActive.length > 0) return SendoutStatusSchemes.Active;
              return SendoutStatusSchemes[status];
            }
          }
    }
  }

  checkStatus = (sendouts, status) => sendouts.find((sendout) => sendout.sendout_status_id === status);

  determineJobOrderStatus(statusId) {
    const statuses = {};

    switch (statusId) {
      case SendoutStatusSchemes.Placed:
        statuses.status_id = JobOrderStatusSchemes.Placed;
        break;
      case SendoutStatusSchemes.Sendover:
        statuses.status_id = JobOrderStatusSchemes.Sendover;
        break;
      case SendoutStatusSchemes.Declined:
      case SendoutStatusSchemes.NoOffer:
        statuses.status_id = JobOrderStatusSchemes.Ongoing;
        break;
      default:
        statuses.status_id = JobOrderStatusSchemes.Sendout;
        break;
    }

    return statuses;
  }

  async updateJobOrderStatus(sendout, statusId, userId, trx) {
    if (jobOrder!= null) {
    const sendoutId = sendout.id;
    const jobOrder = await sendout.joborder().fetch();
    const jobOrderId = jobOrder.id;
    const currentStatusId = jobOrder.status_id;

    
      if (currentStatusId === JobOrderStatusSchemes.Placed) return;

      const whereClause = { job_order_id: jobOrderId };
      const sendoutStatus = await this.determineEntityStatus(sendoutId, statusId, whereClause);
      const { status_id } = this.determineJobOrderStatus(sendoutStatus);

      jobOrder.merge({
        status_id,
        updated_by: userId,
      });

      await jobOrder.save(trx);

      if (currentStatusId === JobOrderStatusSchemes.Placed) {
        await trx
          .table('companies')
          .update('company_type_id', companyType.Client)
          .whereRaw('id in (select company_id from job_orders where id = ?)', jobOrderId);
      }

      const eventData = {
        sendout_id: sendoutId,
        triggered_by_user_id: userId,
        event_type_id: SendoutEventType.UpdatedJobOrder,
        event_details: jobOrder,
      };
      await SendoutEventLog.create(eventData, trx);
    }
    
  }

  determineCandidateStatus(statusId) {
    const statuses = {};

    switch (statusId) {
      case SendoutStatusSchemes.Placed:
        statuses.status_id = CandidateStatusSchemes.Placed;
        break;
      case SendoutStatusSchemes.Sendover:
        statuses.status_id = CandidateStatusSchemes.Sendover;
        break;
      case SendoutStatusSchemes.Declined:
      case SendoutStatusSchemes.NoOffer:
        statuses.status_id = CandidateStatusSchemes.Ongoing;
        break;
      default:
        statuses.status_id = CandidateStatusSchemes.Sendout;
        break;
    }

    return statuses;
  }

  async updateCandidateStatus(sendout, statusId, userId, trx) {
    const sendoutId = sendout.id;
    const candidate = await sendout.candidate().fetch();
    if(candidate){
      const candidateId = candidate.id;
      const currentStatusId = candidate.status_id;


      if (currentStatusId === CandidateStatusSchemes.Placed) return;

      const whereClause = { candidate_id: candidateId };
      const sendoutStatus = await this.determineEntityStatus(sendoutId, statusId, whereClause);
      const { status_id } = this.determineCandidateStatus(sendoutStatus);

      
        candidate.merge({
          status_id,
          updated_by: userId,
        });
    
        await candidate.save(trx);
    
        const eventData = {
          sendout_id: sendoutId,
          triggered_by_user_id: userId,
          event_type_id: SendoutEventType.UpdatedCandidate,
          event_details: candidate,
        };
    
      

      await SendoutEventLog.create(eventData, trx);
    }
  }

  async listingSendoutTypes() {
    try {
      const sendoutTypes = await SendoutType.query().setHidden(auditFields).orderBy('title').fetch();

      return { success: true, code: 200, data: sendoutTypes };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
      return {
        success: false,
        code: 500,
        message: Antl.formatMessage('messages.error.internalServer', {
          action: 'retrieving',
          entity: 'Sendout types',
        }),
      };
    }
  }

  async listingSendoutStatuses({ type }) {
    try {
      const query = SendoutStatus.query();

      if (type) {
        query.select('id', 'title', 'style as color').where('sendout_type_id', type);
      } else {
        query.with('type', (builder) => {
          builder.select('id', 'title', 'style');
        });
      }

      const statuses = await query.setHidden(auditFields).orderBy('id', 'asc').fetch();

      return { success: true, code: 200, data: statuses };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
      return {
        success: false,
        code: 500,
        message: Antl.formatMessage('messages.error.internalServer', {
          action: 'retrieving',
          entity: 'Sendout statuses',
        }),
      };
    }
  }

  async listingSendoutInterviewTypes() {
    try {
      const interviewTypes = await SendoutInterviewType.query().setHidden(auditFields).orderBy('title').fetch();

      return { success: true, code: 200, data: interviewTypes };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
      return {
        success: false,
        code: 500,
        message: Antl.formatMessage('messages.error.internalServer', {
          action: 'retrieving',
          entity: 'Interview types',
        }),
      };
    }
  }

  async listingSendoutTemplates({ jobOrderId, typeId }) {
    try {
      const joborder = await JobOrderRepository.getInfoToTemplate(jobOrderId);
      const sendoutTemplates = await SendoutTemplate.query()
        .where('sendout_type_id', typeId)
        .setHidden(auditFields)
        .first();

      if (joborder) {
        let newTemplate = sendoutTemplates.html.replace('{{job_order_title}}', joborder.title);
        sendoutTemplates.html = newTemplate;
      }

      return { success: true, code: 200, data: sendoutTemplates };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
      return {
        success: false,
        code: 500,
        message: Antl.formatMessage('messages.error.internalServer', {
          action: 'retrieving',
          entity: 'Template',
        }),
      };
    }
  }


  /**
   * Returns the dashboard totals of sendouts
   *
   * @param {Object} params
   *
   * @return {Object} The sendout totals
   */
   async dashboard(params) {
    try {
    
      const sendoutDashboard = new SendoutDashboard();      
      const records = await sendoutDashboard.getDashboardQuery(params.week);
      const sendoutRecords = sendoutDashboard.flattenRecords(records); 
      
      return {
        success: true,
        code: 200,
        data: sendoutRecords
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });      
      return {
        success: false,
        code: 500,
        message: error.message,
      };
    }
  }
  
  
  
  
  /**
   * Returns the list cutt of date for weeks
   *
   * @return {Object} The list of weeks
   */
   async dashboardWeeks() {
    try {
      
      const currentWeek = { title: 'Current week' };
      const weeksRecords = await Database
      .select(Database.raw(`concat( to_char(cutoff_date, 'Month'),date_part('year',cutoff_date),' / Week ', to_char(cutoff_date, 'W') ) as title`))
      .select(Database.raw(`to_char(cutoff_date, '${FORMAT_WEEK_DATE}') as date`))
      .select('cutoff_date')
      .distinct()      
      .from('sendout_board_histories as brd') 
      .orderBy('cutoff_date','DESC')     
      const weeks = [currentWeek, ...weeksRecords];

      return {
        success: true,
        code: 200,
        data: weeks
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
      return {
        success: false,
        code: 500,
        message: error.message,
      };
    }
  }

  
  /**
   * Returns the dashboard totals of sendouts for recruiters
   *
   * @param {Object} params
   *
   * @return {Object} The sendout totals
   */
   async dashboardRecruiters(params) {
    try {
      
      const sendoutDashboard = new SendoutDashboard();          
      const [isWeeklyHistory, table] = sendoutDashboard.getWeeklyData(params.week);
      const queryRecruiters = Database
      .select(Database.raw(`
        coach,
        recruiter,
        ROUND(daily) daily,
        m,
        t,
        w,
        th,
        f,
        goal,
        total actual,
        adjusted,
        CASE WHEN adjusted = 0 THEN ' ' ELSE CONCAT(ROUND(total::numeric/adjusted::numeric*100),' %') END percentage
      `))
      .from(table, 'brd')    
      .where('coach',params.coach)

      if(isWeeklyHistory)        
        sendoutDashboard.addFilterByDate(queryRecruiters, params.week);
      
      queryRecruiters.orderBy('recruiter')

      const recruiters = await Database.select('*').from(
        Database
        .union(queryRecruiters)
        .as('item')
      )

      return {
        success: true,
        code: 200,
        data: recruiters
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
      return {
        success: false,
        code: 500,
        message: error.message,
      };
    }
  }

  /**
   * Returns the summary totals of sendouts
   *
   * @param {Object} request
   * @param {Integer} userId
   * @param {Integer} timezone
   *
   * @return {Object} The sendout totals
   */
  async summary(request, userId, timezone) {
    try {
      const groupByValues = ['so.sendout_status_id'];
      const summaryData = {
        active_fees: 0,
        fees_total: 0,
        converted: 0,
      };

      const { userFilter, recruiterIds } = request;

      let querySplit = Database.raw(
        'SUM(CASE WHEN so.job_order_accountable_id = so.candidate_accountable_id THEN 1 ELSE 2 END) as total_status'
      );

      if (Number(userFilter) === userFilters.Mine || recruiterIds) {
        querySplit = Database.raw('count(so.id) as total_status');
      }

      const useIndividualMetrics = parseBoolean(Env.get('FEAT_INDIVIDUAL_METRICS'));
      const sendoutClauses = useIndividualMetrics
        ? [
            querySplit,
            Database.raw('SUM( CASE WHEN so.converted = true THEN 1 ELSE 0 END ) AS converted'),
            Database.raw(new ActiveFeeAmountQueryBuilder().getDatabaseQueryRaw(request)),
            Database.raw(new PlacedFeeAmountQueryBuilder().getDatabaseQueryRaw(request)),
            'so.sendout_status_id',
          ]
        : [
            querySplit,
            Database.raw('SUM( CASE WHEN so.converted = true THEN 1 ELSE 0 END ) AS converted'),
            Database.raw(
              `SUM( CASE WHEN so.sendout_status_id = ${SendoutStatusSchemes.Active} THEN so.fee_amount ELSE 0 END ) AS active_fees`
            ),
            Database.raw(
              `SUM( CASE WHEN so.sendout_status_id = ${SendoutStatusSchemes.Placed} THEN so.fee_amount ELSE 0 END ) AS fees_total`
            ),
            'so.sendout_status_id',
          ];

      const sendouts = await this.getListing(request, userId, timezone, sendoutClauses, false, groupByValues, false);
      this.calculateSummaryResult(SendoutStatusSchemes, sendouts, summaryData);

      const summaryColumns = cloneDeep(this.summaryColumns);
      await this.formatSummaryResult(summaryColumns, summaryData);

      useIndividualMetrics && new FeeAmountConditionalCopy().populateConditionalCopy(request, summaryColumns);

      return {
        success: true,
        code: 200,
        data: summaryColumns,
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      return {
        success: false,
        code: 500,
        message: error.message,
      };
    }
  }

  calculateSummaryResult(status, sendouts, summaryData) {
    for (const key in status) {
      const id = status[key];
      const countObj = find(sendouts, { sendout_status_id: Number(id) });
      if (countObj) {
        const { active_fees = 0, fees_total = 0, converted = 0, total_status = 0 } = countObj;
        summaryData[key.toLowerCase()] = total_status;
        summaryData.active_fees += Number(active_fees);
        summaryData.fees_total += Number(fees_total);
        summaryData.converted += Number(converted);
      } else {
        summaryData[key.toLowerCase()] = 0;
      }
    }

    const totalSendovers =
      summaryData.sendover + summaryData.sendovernooffer + summaryData.sendoverdeclined + summaryData.converted;
    summaryData.total_sendovers = totalSendovers;

    const totalSendouts = summaryData.active + summaryData.placed + summaryData.declined + summaryData.nooffer;
    summaryData.total_sendouts = totalSendouts;

    const ratioPlaced = summaryData.placed ? Math.round((totalSendouts - summaryData.active) / summaryData.placed) : 0;
    summaryData.placement_ratio = ratioPlaced ? `${ratioPlaced}/1` : 'NA';

    const ratioSendover = summaryData.converted ? Math.round(totalSendovers / summaryData.converted) : 0;
    summaryData.sendover_ratio = ratioSendover ? `${ratioSendover}/1` : 'NA';

    summaryData.fee_average = summaryData.placed === 0 ? 0 : summaryData.fees_total / summaryData.placed;
    summaryData.metrics = summaryData.active_fees / 5;
  }

  async formatSummaryResult(summaryColumns, summaryData) {
    const statuses = (await SendoutStatus.all()).toJSON();
    for (const column of summaryColumns) {
      column.rows.forEach((row) => {
        if (row.type === 'status') {
          const status = find(statuses, { id: SendoutStatusSchemes[row.key] });
          if (status) {
            row.style.statusColor = status.style;
            row.label = status.label;
          }
        }
        row.key = row.key.toLowerCase();
        if (row.style.formatter === 'currency_bold') {
          row.value = this.formatNumber(summaryData[row.key]);
        } else {
          row.value = summaryData[row.key];
        }
      });
    }
  }

  formatNumber(number) {
    return (Math.round(number * 100) / 100).toFixed(2);
  }

  async updateStatus(id, statusId, eventTypeId, userId) {
    const sendout = await Sendout.find(id);
    if (!sendout) {
      return;
    }
    sendout.merge({ sendout_status_id: statusId });
    await sendout.save();
    Event.fire(EventTypes.Sendout.UpdatedStatus, {
      sendout_id: sendout.id,
      triggered_by_user_id: userId,
      event_type_id: eventTypeId,
      event_details: userId,
    });
  }

  /**
   *
   * Convertion of the Sendover to Sendout,
   * Send or not send email to hiring authority by type and and if shipping is allowed,
   * Send notification email to OPS and distribution lists,
   * Send reminders based on its interviews
   *
   * Returns a custom response that determines the creation of a sendout.
   *
   * @param {Object} params
   * @param {Object} req
   * @param {Integer} userId
   * @param {String} timezone
   *
   * @return {Object} A success with a code 200 and message or a message error with an error code
   */
  async convertSendoverToSendout(params, req, userId, timezone) {
    const sendout = await Sendout.find(params.id);

    if (!sendout) {
      return {
        success: false,
        code: 404,
        message: Antl.formatMessage('messages.error.notFound', {
          entity: 'Sendover',
        }),
      };
    }

    const {
      type_id,
      status_id,
      fee_amount,
      attachments,
      interviews,
      cc_emails,
      bcc_emails,
      subject,
      template,
      company_id,
      job_order_accountable_id,
      company_owner_id,
      candidate_accountable_id,
      candidate_owner_id,
      send_email,
      hiring_authority,
    } = req;

    req['timezone'] = timezone;
    req['converted'] = true;

    let trx;

    try {
      trx = await Database.beginTransaction();

      const sendoutId = sendout.id;
      const statusId = status_id;
      const allowSendEmail = parseBoolean(send_email);

      const jobOrderAccountableIdTemp = job_order_accountable_id || company_owner_id;
      const jobOrderAccountableId =
        sendout.job_order_accountable_id === jobOrderAccountableIdTemp
          ? sendout.job_order_accountable_id
          : jobOrderAccountableIdTemp;

      const candidateAccountableIdTemp = candidate_accountable_id || candidate_owner_id;
      const candidateAccountableId =
        sendout.candidate_accountable_id === candidateAccountableIdTemp
          ? sendout.candidate_accountable_id
          : candidateAccountableIdTemp;

      let eventData = {
        sendout_id: sendoutId,
        triggered_by_user_id: userId,
        event_type_id: allowSendEmail
          ? SendoutEventType.SendoverSwitchedEmail
          : SendoutEventType.SendoverSwitchedwithoutEmail,
        event_details: {},
      };

      const emailDetails = await SendoutEmailDetail.find(sendout.sendout_email_detail_id);

      emailDetails.merge({
        cc_emails,
        bcc_emails,
        subject,
        template,
        updated_by: userId,
      });

      await emailDetails.save(trx);
      eventData.event_details.email_details = emailDetails;

      const trackingDate = moment().format(DateFormats.SystemDefault);
      const boardDate = await this.timeOffHelper.getBoardDate(new Date());

      sendout.merge({
        sendout_type_id: type_id,
        sendout_status_id: statusId,
        fee_amount,
        tracking_date: trackingDate,
        board_date: boardDate,
        updated_by: userId,
        converted: true,
        send_email_hiring: allowSendEmail,
        job_order_accountable_id: jobOrderAccountableId,
        candidate_accountable_id: candidateAccountableId,
      });

      await sendout.save(trx);

      await this.updateJobOrderStatus(sendout, statusId, userId, trx);
      await this.updateCandidateStatus(sendout, statusId, userId, trx);

      eventData.event_details.sendout = sendout;

      const newInterviews = await this.createInterviews(interviews, sendoutId, userId, trx);
      eventData.event_details.interviews = newInterviews;

      let newAttachments = [];

      if (allowSendEmail) {
        if (attachments && !attachments.length && attachments.candidate) {
          newAttachments = await this.createAttachments(attachments, sendoutId, trx);
        }
        if (attachments && !attachments.length && attachments.toSend) {
          newAttachments.push(...attachments.toSend);
        }

        eventData.event_details.attachments = newAttachments;
      }

      await SendoutEventLog.create(eventData, trx);

      const emailData = {
        jobOrderId: sendout.job_order_id,
        candidateId: sendout.candidate_id,
        jobOrderAccountableId,
        candidateAccountableId,
        hiringAuthority: hiring_authority,
        ccEmails: cc_emails,
        bccEmails: bcc_emails,
        subject: subject,
        template: template,
        userId,
      };

      let emailResponse;
      if (allowSendEmail) {
        emailResponse = await this.sendoutEmail.createAndSendEmailToHiringAuthority(
          emailData,
          newInterviews,
          newAttachments
        );

        if (emailResponse && emailResponse.success) {
          eventData = {
            sendout_id: sendoutId,
            event_type_id: SendoutEventType.EmailSentToHiringAuthority,
            triggered_by_user_id: userId,
            event_details: {
              email_details: emailData,
              newAttachments,
              newInterviews,
            },
          };

          await SendoutEventLog.create(eventData, trx);
        }
      }

      if (emailResponse && !emailResponse.success) {
        trx && (await trx.rollback());
        throw emailResponse.message || `Unexpected error while sending email to hiring authority`;
      }

      trx && (await trx.commit());

      await this.createRemindersAndCreateEmail(
        sendoutId,
        statusId,
        req,
        interviews,
        newAttachments,
        userId,
        allowSendEmail
      );

      const sendoutDetails = await this.details(sendoutId, this.defaultRelations);

      const jobOrder = await sendout.joborder().fetch();

      const payloadActivityLog = {
        typeId: sendout.sendout_type_id,
        statusId: sendout.sendout_status_id,
        logTypeId: activityLogTypes.ConversionOfSendover,
        companyId: jobOrder.company_id || company_id,
        jobOrderId: sendout.job_order_id,
        candidateId: sendout.candidate_id,
        sendoutId: sendout.id,
        interviews,
        converted: true,
        timezone,
        userId: jobOrderAccountableId,
      };

      if (!Helpers.isAceCommand()) {
        Event.fire(EventTypes.Sendout.Converted, { payloadActivityLog });
      }

      return {
        success: true,
        code: 201,
        data: sendoutDetails,
        message: Antl.formatMessage('messages.success.update', {
          entity: 'Sendout',
        }),
      };
    } catch (error) {
      trx && (await trx.rollback());

      const properties = {
        type_id,
        status_id,
        job_order_id,
        candidate_id,
        job_order_accountable_id,
        candidate_accountable_id,
      };

      appInsights.defaultClient.trackEvent({ name: 'Sendout Failed', properties });
      appInsights.defaultClient.trackException({ exception: error });

      return {
        success: false,
        code: 500,
        title: Antl.formatMessage('messages.error.sendout.conversion.title'),
        message: Antl.formatMessage('messages.error.sendout.message'),
      };
    }
  }

  async getMessageActivityLog(payload, sendoutId, userId) {
    if(payload){
    const { typeId, statusId, jobOrderId, candidateId, interviews, declinationDetails, converted, deleted, timezone } =
      payload;

    const user = await UserRepository.getDetails(userId);
    const jobOrder = await JobOrderRepository.details(jobOrderId, 'compact');
    const candidate = await CandidateRepository.details(candidateId, 'compact');
    let hiringAuthority = await SendoutHasHiringAuthority.query().where('sendout_id', sendoutId).first();
    hiringAuthority = await HiringAuthorityRepository.findWithAll(hiringAuthority.hiring_authority_id);

    let dateCopy,
      extraBody = '';
    const sendoutBody = `
      Company: ${jobOrder ? jobOrder.company.name : ''} <br>
      Hiring Authority: ${hiringAuthority ? hiringAuthority.full_name : ''} <br>
      Candidate: ${candidate ? candidate.personalInformation.full_name : ''} <br>
      Functional Title: ${jobOrder ? jobOrder.title : ''} <br>
    `;

    if (parseBoolean(deleted)) {
      return `${typeId === SendoutTypesSchemes.Sendover ? 'Sendover' : 'Sendout'} deleted by ${user.full_name} ${
        user.initials
      } <br> ${sendoutBody}`;
    } else if (statusId === SendoutStatusSchemes.Placed) {
      return `Sendout marked manually as placed by ${user.full_name} ${user.initials} <br> ${sendoutBody}`;
    } else if (typeId === SendoutTypesSchemes.Sendover || parseBoolean(converted)) {
      const date = moment().utcOffset(Number(timezone)).format(DateFormats.DateSendout);
      dateCopy = `Resume Sent Date: ${date} CST`;
    } else if (typeId === SendoutTypesSchemes.Sendout && statusId === SendoutStatusSchemes.Active) {
      if (interviews && interviews.length > 0) {
        for (const interview of interviews) {
          let date = moment(interview.interview_date).format(
            interview.interview_range ? DateFormats.OnlyDateMonthDayYear : DateFormats.DateSendout
          );
          date = interview.interview_range
            ? `${date} - ${this.dateRangeFormat(interview.interview_range, timezone)}`
            : date;
          let offset = this.getTimezoneByName(interview.interview_time_zone);
          dateCopy = `Interview Date / Time: ${date} ${offset}`;
        }
      }
    }

    /** Creates status refussion reasons */
    if (declinationDetails && LogTypesBySendoutStatus[statusId]) {
      const declinations = unWrapDeclinationDetails(declinationDetails);
      const options = declinations && declinations.declined_fields;
      const list = options
        ? '<ul>' +
          options
            .map((option) => {
              return '<li>' + option + '</li>';
            })
            .join('') +
          '</ul>'
        : '';
      const notes = declinations && declinations.declination_notes;
      extraBody = `${list}<br>${notes || ''}`;
    }

    dateCopy = dateCopy ? `${dateCopy} <br>` : '';
    return `${dateCopy} ${sendoutBody} ${extraBody}`;
  }
  }

  async updateFeeAmount(feeAmount, sendoutId) {
    const sendout = await Sendout.find(sendoutId);
    if (!sendout) return;
    sendout.merge({ fee_amount: feeAmount });
    await sendout.save();
  }

  async fileTypesForPlacement(sendoutId) {
    try {
      const haveReferenceRelease = await Database.table('reference_release_emails')
        .whereIn('candidate_id', Database.raw('SELECT candidate_id from sendouts where id = ?', [sendoutId]))
        .first();

      const query = FileType.query().where({ module: 'placement' });
      haveReferenceRelease && query.where('id', '!=', types.REFERENCE_RELEASE_EMAIL._id);

      const fileTypes = await query.orderBy('order').fetch();
      return {
        success: true,
        data: fileTypes,
        code: 200,
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      return {
        success: false,
        code: 500,
        message: Antl.formatMessage('messages.error.internalServer', {
          action: 'retrieving',
          entity: 'file types',
        }),
      };
    }
  }

  /**
   * Returns placements from a sendout
   *
   * @method placements
   *
   * @param {Integer} id
   *
   * @return {Object} Placements
   */
  async getPlacements(id) {
    try {
      const PlacementRepository = new (use('App/Helpers/PlacementRepository'))();
      const placementsList = await PlacementRepository.getPreviews({
        sendout_id: id,
      });
      return {
        code: 200,
        data: placementsList,
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      return {
        success: false,
        code: 500,
        message: Antl.formatMessage('messages.error.internalServer', {
          action: 'getting',
          entity: 'placements',
        }),
      };
    }
  }

  /* Returns the  totals of sendouts
   *
   * @param {Object} request
   * @param {Integer} userId
   * @param {Integer} timezone
   *
   * @return {Object} The sendout totals
   */
  async getBoard() {
    try {
      const query = await Database.select('*').from('v_weekly_sendout_board_yesterday');

      return {
        success: true,
        code: 200,
        data: query,
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      return {
        success: false,
        code: 500,
        message: Antl.formatMessage('messages.error.internalServer', {
          action: 'retrieving',
          entity: 'Board',
        }),
      };
    }
  }

  async remove(params, userId) {
    const sendoutId = params.id;
    const sendout = await Sendout.find(sendoutId);

    if (!sendout || sendout.deleted) {
      return {
        success: false,
        code: 404,
        message: Antl.formatMessage('messages.error.notFound', {
          entity: 'Sendout or Sendover',
        }),
      };
    }

    const isOperations = await UserRepository.hasRole(userId, userRoles.Operations);

    if (!isOperations) {
      return {
        success: false,
        code: 403,
        isInactive: false,
        redirect: false,
        message: "You don't have the permission required to use the resource",
      };
    }

    const { count } = await Database.table('placements')
      .select(Database.raw('count(*) as count'))
      .where('sendout_id', sendoutId)
      .first();

    if (count > 0) {
      return {
        success: false,
        code: 403,
        title: "Sendout can't be deleted",
        message:
          "This Sendout is already linked to a finished Placement or is in an ongoing Placement and can't be deleted anymore.",
      };
    }

    const sendoutType =
      sendout.sendout_type_id === SendoutTypesSchemes.Sendout
        ? {
            message: 'Sendout',
            logTypeId: activityLogTypes.SendoutDeleted,
          }
        : {
            message: 'Sendover',
            logTypeId: activityLogTypes.SendoverDeleted,
          };

    try {
      sendout.merge({
        deleted: true,
        updated_by: userId,
      });

      await sendout.save();

      if (sendout.sendout_type_id === SendoutTypesSchemes.Sendout) this.deleteReminders(sendoutId, userId);

      const jobOrder = await sendout.joborder().fetch();

      const payloadActivityLog = {
        typeId: sendout.sendout_type_id,
        logTypeId: sendoutType.logTypeId,
        companyId: jobOrder.company_id,
        jobOrderId: sendout.job_order_id,
        candidateId: sendout.candidate_id,
        sendoutId: sendout.id,
        deleted: true,
        userId,
      };

      Event.fire(EventTypes.Sendout.Deleted, { payloadActivityLog });

      return {
        success: true,
        code: 200,
        message: Antl.formatMessage('messages.success.delete', {
          entity: sendoutType.message,
        }),
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });

      return {
        success: false,
        code: 500,
        title: Antl.formatMessage('messages.error.sendout.delete.title', {
          entity: sendoutType.message,
        }),
        message: Antl.formatMessage('messages.error.sendout.message'),
      };
    }
  }

  /** Method to get Board Frontend configuration
   *
   * @returns {Object} Configuration based on modulePresetConfig.sendoutsBoardConfig
   */
  async getBoardConfiguration() {
    try {
      const config = await ModulePresetsConfigRepository.getById('sendoutsBoardConfig');
      return {
        success: true,
        code: 200,
        data: config,
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
      return {
        success: false,
        code: 500,
        message: Antl.formatMessage('messages.error.internalServer', {
          action: 'retrieving',
          entity: 'Board',
        }),
      };
    }
  }

  async sendUnconvertedSendovers() {
    const sendgridConfigurationKey = 'UnconvertedSendovers';
    const unconvertedConfigurationKey = 'sendoversUnconvertedEmail';

    const additionalConfig = await ModulePresetsConfigRepository.getById(unconvertedConfigurationKey);
    if (!additionalConfig) throw 'Additional email configuration from is missing';

    const { to } = additionalConfig.data;
    if (!to) throw 'Additional email configuration from is missing';

    const unconvertedSendovers = await this.getUnconvertedSendoversForEmails();
    const templateData = {
      items: unconvertedSendovers,
      url: `${Env.get('PUBLIC_URL_WEB')}/sendouts`,
      period: this.timeOffHelper.isMonday() ? 'the last week' : 'the current week',
    };

    const emailResponse = await GenericSendgridTemplateEmail.sendViaConfig(
      [{ to }],
      templateData,
      sendgridConfigurationKey
    );

    return emailResponse;
  }

  async getUnconvertedSendoversForEmails() {
    const query = Database.table('sendouts as so');
    let periodClause = '';

    if (this.timeOffHelper.isMonday()) {
      const clauseForPreviousWeek = `date_trunc('week', board_date) = date_trunc('week', now() - INTERVAL '1 WEEK')`;
      periodClause = clauseForPreviousWeek;
    } else {
      const clauseForCurrentWeek = `board_date::date >= date_trunc('week', now()) and board_date::date <= (now() - INTERVAL '1 DAY')::date`;
      periodClause = clauseForCurrentWeek;
    }

    query
      .select([
        'so.id',
        'co.name as company',
        'ca_pi.full_name as candidate',
        'jo_accountable.initials as joRecruiter',
        'jo_accountable.user_name as recruiterName',
        Database.raw(`
          CASE
            WHEN jo_accountable.initials <> ca_accountable.initials THEN ca_accountable.initials
            ELSE ''
          END as caRecruiter`),
        'jo_coach_accountable.user_name as coach',
        'spec.industry as industry',
        Database.raw(`to_char(board_date, 'mm/dd/yyyy') as trackingDate`),
      ])
      .innerJoin('job_orders as jo', 'so.job_order_id', 'jo.id')
      .innerJoin('companies as co', 'jo.company_id', 'co.id')
      .innerJoin('candidates as ca', 'so.candidate_id', 'ca.id')
      .innerJoin('personal_informations as ca_pi', 'ca.personal_information_id', 'ca_pi.id')
      .innerJoin('v_users as jo_accountable', 'so.job_order_accountable_id', 'jo_accountable.id')
      .innerJoin('v_users as ca_accountable', 'so.candidate_accountable_id', 'ca_accountable.id')
      .innerJoin('v_users as jo_coach_accountable', 'jo_accountable.coach_id', 'jo_coach_accountable.id')
      .innerJoin('v_users as ca_coach_accountable', 'ca_accountable.coach_id', 'ca_coach_accountable.id')
      .innerJoin('v_specialties as spec', 'jo.specialty_id', 'spec.id')
      .whereRaw(`so.sendout_type_id = ? and so.sendout_status_id = ? and deleted = false and ${periodClause}`, [
        SendoutTypesSchemes.Sendover,
        SendoutStatusSchemes.Sendover,
      ])
      .orderByRaw('jo_coach_accountable.user_name, jo_accountable.user_name, board_date desc');

    const results = await query;

    return addToggler(results);
  }

  /**
   * Send email Last week's sendout leaders.
   *
   */
  async sendDailyLeaders() {
    const sendgridConfigurationKey = this.timeOffHelper.isMonday() ? 'LastWeeksSendoutLeaders' : 'DailySendoutLeaders';
    const DailyLeadersConfigurationKey = 'DailyLeaders';

    const additionalConfig = await ModulePresetsConfigRepository.getById(DailyLeadersConfigurationKey);
    if (!additionalConfig) throw 'Additional email configuration from is missing';

    const { to } = additionalConfig.data;
    if (!to) throw 'Additional email configuration from is missing';

    const payload = await this.getDailyLeaders();
    const templateData = {
      ...payload,
      url: `${Env.get('PUBLIC_URL_WEB')}/dashboard/sendouts`,
    };

    const emailResponse = await GenericSendgridTemplateEmail.sendViaConfig(
      [{ to }],
      templateData,
      sendgridConfigurationKey
    );

    return emailResponse;
  }

  /**
   *
   * @returns
   */
  async cutOffBoardWeekly() {
    try {
      await Database.raw('call boards_weekly_cutoff();');

      return {
        success: true,
        message: Antl.formatMessage('messages.success.creation', {
          entity: 'Board history',
        }),
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
      return {
        success: false,
        code: 500,
        message: Antl.formatMessage('messages.error.internalServer', {
          action: 'creating',
          entity: 'Board history',
        }),
      };
    }
  }

  /**
   *
   * @returns
   */
  async cutOffGoalWeekly() {
    try {
      const query = `
        insert into sendout_current_goals (recruiter_id, goal, created_at, updated_at)
        select recruiter_id, goal, now(), now() from v_sendout_current_goals;
      `;
      await Database.raw(query);

      return {
        success: true,
        message: Antl.formatMessage('messages.success.creation', {
          entity: 'Weekly goals',
        }),
      };
    } catch (error) {
      appInsights.defaultClient.trackException({ exception: error });
      return {
        success: false,
        message: Antl.formatMessage('messages.error.internalServer', {
          action: 'creating',
          entity: 'goals',
        }),
      };
    }
  }

  /**
   *
   * @param {*} coaches
   * @param {*} recruiters
   * @returns coachesByRecruiters
   */
  groupByCoachesAndRecruiters(coaches, recruiters) {
    const groups = coaches.map((coach) => {
      return {
        ...coach,
        recruiters: recruiters.filter((recruiter) => recruiter.coach_id === coach.id),
      };
    });

    return groups;
  }

  /**
   *
   * @returns monthly_sendouts
   */
  getClauseForMonthlySendoutsOfWeek() {
    const clauseCurrentDay = `timezone('US/Central'::text, now())`;
    const clauseCondiction = this.timeOffHelper.isMonday()
      ? `sendouts.board_date >= date_trunc('month'::text, date_trunc('week', ${clauseCurrentDay} - INTERVAL '1 WEEK'))::date AND sendouts.board_date < date_trunc('week', ${clauseCurrentDay}::date)`
      : `sendouts.board_date >= date_trunc('month'::text, date_trunc('week', ${clauseCurrentDay}))::date AND sendouts.board_date < ${clauseCurrentDay}::date`;

    return `WITH monthly_sendouts AS (
      SELECT vsr.recruiter_id,
          vsr.regional_id,
          vsr.coach_id,
          count(sendout.id) AS total
          FROM v_sendout_recruiters vsr
          LEFT JOIN ( SELECT sendouts.id,
                  sendouts.board_date,
                  sendouts.sendout_type_id,
                  sendouts.job_order_accountable_id,
                  sendouts.candidate_accountable_id
                FROM sendouts
                WHERE ${clauseCondiction} AND sendouts.sendout_type_id = 1 and sendouts.deleted = false) sendout ON vsr.recruiter_id = sendout.job_order_accountable_id OR vsr.recruiter_id = sendout.candidate_accountable_id
        GROUP BY vsr.recruiter_id, vsr.coach_id, vsr.regional_id
      )`;
  }

  /**
   *
   * @returns last week leaders
   */
  async getLastWeekLeaders() {
    const clauseForPreviousWeek = `date_trunc('week', now() - INTERVAL '1 WEEK')`;
    const clauseForNumberWeek = `DATE_PART('week', ${clauseForPreviousWeek})`;
    const clauseForMonthlySendout = this.getClauseForMonthlySendoutsOfWeek();

    let weeksLeaders = await Database.table('v_sendout_board_histories')
      .select(['recruiter', 'total as sendout'])
      .whereRaw(`total >= ${minimumForWeekLeaders} and nweek = ${clauseForNumberWeek}`)
      .orderBy('total', 'desc');
    weeksLeaders = addToggler(weeksLeaders);

    let leaders = await Database.table('v_sendout_board_histories')
      .select(['recruiter', 'f as sendout'])
      .whereRaw(`f >= ${minimumForDailyLeaders} and nweek = ${clauseForNumberWeek}`)
      .orderBy('f', 'desc');
    leaders = addToggler(leaders);

    const gpac = await Database.raw(
      `${clauseForMonthlySendout} select (true) as principal, 'gpac' as regional, sum(m) as m, sum(t) as t, sum(w) as w, sum(th) as th, sum(f) as f, sum(goal) as goal, sum(total) as total, sum(adjusted) as adjusted, (select sum(total) from monthly_sendouts) as month from v_sendout_board_histories where nweek = ${clauseForNumberWeek};`
    );
    let regionals = await Database.raw(
      `${clauseForMonthlySendout} select regional, sum(m) as m, sum(t) as t, sum(w) as w, sum(th) as th, sum(f) as f, sum(goal) as goal, sum(vwsbh.total) as total, sum(adjusted) as adjusted, sum(vsm.total) as month from v_sendout_board_histories vwsbh inner join monthly_sendouts vsm on vsm.recruiter_id = vwsbh.recruiter_id where nweek = ${clauseForNumberWeek} group by regional order by regional;`
    );
    regionals = addToggler(regionals.rows);
    const coaches = await Database.raw(
      `${clauseForMonthlySendout} select coach as id, concat('Team', ' ', coach_alias) AS coach, sum(m) as m, sum(t) as t, sum(w) as w, sum(th) as th, sum(f) as f, sum(goal) as goal, sum(vwsbh.total) as total, sum(adjusted) as adjusted, sum(vsm.total) as month from v_sendout_board_histories vwsbh inner join monthly_sendouts vsm on vsm.recruiter_id = vwsbh.recruiter_id where nweek = ${clauseForNumberWeek} group by coach, coach_alias order by coach;`
    );
    let recruiters = await Database.raw(
      `${clauseForMonthlySendout} select coach as coach_id, recruiter, vu.channel_full_name as channel, m, t, w, th, f, goal, vwsbh.total as total, adjusted, vsm.total as month from v_sendout_board_histories vwsbh inner join monthly_sendouts vsm on vsm.recruiter_id = vwsbh.recruiter_id inner join v_users vu on vu.recruiter_id = vwsbh.recruiter_id where nweek = ${clauseForNumberWeek} order by coach, recruiter;`
    );
    recruiters = addToggler(recruiters.rows);
    const teams = this.groupByCoachesAndRecruiters(coaches.rows, recruiters);

    return {
      currentDays: [{ title: 'M' }, { title: 'T' }, { title: 'W' }, { title: 'TH' }, { title: 'F' }],
      weeksLeaders,
      leaders,
      regionals: [...gpac.rows, ...regionals],
      coaches: teams,
    };
  }

  /**
   *
   * @param previousDay
   * @returns week leaders at day
   */
  async getThisWeekLeadersAtDay(previousDay) {
    const clauseForMonthlySendout = this.getClauseForMonthlySendoutsOfWeek();

    const currentDaysOfTitle = {
      m: [{ title: 'M' }],
      t: [{ title: 'M' }, { title: 'T' }],
      w: [{ title: 'M' }, { title: 'T' }, { title: 'W' }],
      th: [{ title: 'M' }, { title: 'T' }, { title: 'W' }, { title: 'TH' }],
      f: [{ title: 'M' }, { title: 'T' }, { title: 'W' }, { title: 'TH' }, { title: 'F' }],
    };
    const sumColumnsOfDay = {
      m: 'sum(m) as m',
      t: 'sum(m) as m, sum(t) as t',
      w: 'sum(m) as m, sum(t) as t, sum(w) as w',
      th: 'sum(m) as m, sum(t) as t, sum(w) as w, sum(th) as th',
      f: 'sum(m) as m, sum(t) as t, sum(w) as w, sum(th) as th, sum(f) as f',
    };
    const columnsOfDay = {
      m: 'm',
      t: 'm, t',
      w: 'm, t, w',
      th: 'm, t, w, th',
      f: 'm, t, w, th, f',
    };

    let leaders = await Database.table('v_weekly_sendout_board_yesterday')
      .select(['recruiter', `${previousDay} as sendout`])
      .whereRaw(`${previousDay} >= ${minimumForDailyLeaders}`)
      .orderBy(`${previousDay}`, 'desc');
    leaders = addToggler(leaders);

    const gpac = await Database.raw(
      `${clauseForMonthlySendout} select (true) as principal, 'gpac' as regional, ${sumColumnsOfDay[previousDay]}, sum(goal) as goal, sum(total) as total, sum(adjusted) as adjusted, (select sum(total) from monthly_sendouts) as month from v_weekly_sendout_board_yesterday;`
    );
    let regionals = await Database.raw(
      `${clauseForMonthlySendout} select regional, ${sumColumnsOfDay[previousDay]}, sum(goal) as goal, sum(vwsb.total) as total, sum(adjusted) as adjusted, sum(vsm.total) as month from v_weekly_sendout_board_yesterday vwsb inner join monthly_sendouts vsm on vsm.recruiter_id = vwsb.recruiter_id group by regional order by regional;`
    );
    regionals = addToggler(regionals.rows);
    const coaches = await Database.raw(
      `${clauseForMonthlySendout} select coach as id, concat('Team', ' ', coach_alias) AS coach, ${sumColumnsOfDay[previousDay]}, sum(goal) as goal, sum(vwsb.total) as total, sum(adjusted) as adjusted, sum(vsm.total) as month from v_weekly_sendout_board_yesterday vwsb inner join monthly_sendouts vsm on vsm.recruiter_id = vwsb.recruiter_id group by coach, coach_alias order by coach;`
    );
    let recruiters = await Database.raw(
      `${clauseForMonthlySendout} select coach as coach_id, recruiter, vu.channel_full_name as channel, ${columnsOfDay[previousDay]}, goal, (vwsb.total) as total, case when (adjusted) > 0 then (adjusted) else 0 end as adjusted, (vsm.total) as month from v_weekly_sendout_board_yesterday vwsb inner join monthly_sendouts vsm on vsm.recruiter_id = vwsb.recruiter_id inner join v_users vu on vu.recruiter_id = vwsb.recruiter_id order by coach, recruiter;`
    );
    recruiters = addToggler(recruiters.rows);
    const teams = this.groupByCoachesAndRecruiters(coaches.rows, recruiters);

    return {
      currentDays: currentDaysOfTitle[previousDay],
      leaders,
      regionals: [...gpac.rows, ...regionals],
      coaches: teams,
    };
  }

  /**
   *
   * @returns daily leaders sendouts
   */
  async getDailyLeaders() {
    const yesterday = moment().subtract(1, 'days');
    const dayName = yesterday.format('dddd');
    const monthName = yesterday.format('MMMM');

    let subject = this.timeOffHelper.isMonday() ? `Last Week's Send Out Leaders` : `${dayName}'s Send Out Leaders`;

    const DAYS_OF_WEEK = {
      Monday: 'm',
      Tuesday: 't',
      Wednesday: 'w',
      Thursday: 'th',
      Friday: 'f',
    };

    const leaders = this.timeOffHelper.isMonday()
      ? await this.getLastWeekLeaders()
      : await this.getThisWeekLeadersAtDay(DAYS_OF_WEEK[dayName]);

    return { subject, ...leaders, currentMonth: monthName };
  }

  async getTotalForCurrentDay() {
    const trackingDate = await this.timeOffHelper.getBoardDate(new Date());

    const results = await Database.from('sendouts')
      .select([
        Database.raw(
          'COALESCE(sum(CASE WHEN job_order_accountable_id = candidate_accountable_id THEN 1 ELSE 2 END), 0) as total'
        ),
      ])
      .whereRaw(`sendout_type_id = ? and deleted = false and board_date::date = to_date(?, ?)`, [
        SendoutTypesSchemes.Sendout,
        moment(trackingDate).format(DateFormats.Basic),
        DateFormats.Basic,
      ]);

    const total = results[0].total;

    return total;
  }

  async getAccountableUsers(sendoutId) {
    const getFormattedAccountables = (user) => {
      return {
        recruiter: { id: user.id, full_name: user.user_name },
        coach: { id: user.coach_id, full_name: user.coach_name },
      };
    };
    const accountables = {
      candidate: { recruiter: {}, coach: {} },
      joborder: { recruiter: {}, coach: {} },
    };
    const accountableUsersResult = await Database.raw(
      `
        SELECT usr.id, usr.user_name, usr.coach_id, usr.coach_name, 
            CASE
              WHEN so.job_order_accountable_id = usr.id
                  AND so.candidate_accountable_id = usr.id THEN 'same'
              WHEN so.job_order_accountable_id = usr.id THEN 'joborder'
              WHEN so.candidate_accountable_id = usr.id THEN 'candidate'
              ELSE 'error'
            END AS type
        FROM   sendouts so
            INNER JOIN v_users usr
                  ON so.job_order_accountable_id = usr.id
                      OR so.candidate_accountable_id = usr.id
        WHERE  so.id = :sendoutId 
    `,
      { sendoutId }
    );
    const accountableUsers = accountableUsersResult.rows;
    if (find(accountableUsers, { type: 'error' })) {
      throw `Unexpected Behaviour Ocurred While Creating Glip message For Sendout ${sendoutId}`;
    }
    const singleAccountable = find(accountableUsers, { type: 'same' });
    const caAccountable = find(accountableUsers, { type: 'candidate' });
    const joAccountable = find(accountableUsers, { type: 'joborder' });

    const formattedSingleAccountable = singleAccountable ? getFormattedAccountables(singleAccountable) : null;
    accountables.candidate = caAccountable
      ? getFormattedAccountables(caAccountable)
      : formattedSingleAccountable || accountables.candidate;
    accountables.joborder = joAccountable
      ? getFormattedAccountables(joAccountable)
      : formattedSingleAccountable || accountables.joborder;

    accountables.isTheSame = !!formattedSingleAccountable;

    return accountables;
  }

  async getGlipMessage(sendoutId) {
    const {
      candidate: candidateAccountable,
      joborder: joborderAccountable,
      isTheSame = false,
    } = await this.getAccountableUsers(sendoutId);
    const total = await this.getTotalForCurrentDay();

    return this.messagingHelper.getGlipMessage({ total, candidateAccountable, joborderAccountable, isTheSame });
  }

  /**
   *
   * @param {Integer} userId
   * @returns recruiter accountable and coach by job order
   */
  async getAccountableAndCoach(userId) {
    const recruiter = await UserRepository.getDetails(userId, {
      userHiddenFieldsToShow: ['email_signature'],
    });
    const coach = await RecruiterRepository.getCoachInfoByRecruiterId(userId);

    return { recruiter: recruiter, coach: coach };
  }
}

module.exports = SendOutRepository;
