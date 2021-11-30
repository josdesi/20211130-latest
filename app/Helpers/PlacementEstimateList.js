'use strict';

//Utils
const Database = use('Database');
const { find, filter } = use('lodash');
const PlacementListBuilder = use('App/Helpers/PlacementListBuilder');

class PlacementEstimateList extends PlacementListBuilder {
  async get(queryParams) {
    const { limit = 50, ...rest } = queryParams;
    const columnsToSelect = [
      'plt.id',
      'plt.approved_date',
      'plt.additional_invoice_recipients',
      'plt.fee_amount',
      'plt.fee_percentage',
      'plt.first_year_value',
      'plt.fee_agreement_payment_scheme_id',
      'plt.guarantee_days',
      'plt.monthly_amount',
      'plt.notes',
      'plt.sendout_id',
      'plts.title as status_title',
      'plts.id as status_id',
      'spec.industry as industry',
      'spec.title as specialty',
      'sub.title as subspecialty',
      'cp.id as company_id',
      'cp.name as company_name',
      'cp.zip as company_zip',
      'cp.address as company_address',
      'location.state as company_state',
      'location.state_slug as company_state_slug',
      'location.title as company_city',
      'location.country as company_country',
      'location.country_slug as company_country_slug',
      'pic.full_name as candidate_name',
    ];
    this.buildBaseListQuery(columnsToSelect);
    this.query.leftJoin('v_cities as location', 'cp.city_id', 'location.id');
    this.query.where('is_dirty', true);
    await this.applyWhereClause(rest);

    const placements = await this.query.limit(limit);
    const ids = placements.map((val) => val.id);
    const splits = await Database.table('placement_splits as ps')
      .select([
        'usr.id as user_id',
        'usr.user_email',
        'usr.initials as user_initials',
        'usr.user_name',
        'ps.is_channel_partner',
        'ps.placement_id',
        'ps.type',
        'ps.split_percentage'
      ])
      .innerJoin('v_users as usr', 'ps.user_id', 'usr.id')
      .whereIn('ps.placement_id', ids);

    const sendoutIds = placements.map((val) => val.sendout_id);
    const hirings = await Database.table('sendouts as so')
      .select(['ha.full_name', 'ha.work_email as email', 'so.id as sendout_id'])
      .innerJoin('sendout_has_hiring_authorities as sha', 'so.id', 'sha.sendout_id')
      .innerJoin('hiring_authorities as ha', 'sha.hiring_authority_id', 'ha.id')
      .whereIn('so.id', sendoutIds);

    return this.formatEstimateList(placements, splits, hirings);
  }

  formatEstimateList(placements, splits, hirings) {
    return placements.map((placement) => {
      const placementSplits = filter(splits, { placement_id: placement.id });
      const companySplits = filter(placementSplits, { type: 'company' });
      const ha = find(hirings, { sendout_id: placement.sendout_id });
      const { id, approved_date, notes, additional_invoice_recipients } = placement;
      return {
        id,
        approvedDate: approved_date,
        notes,
        additionalInvoiceRecipients: additional_invoice_recipients,
        feeAgreement: this.buildFeeObject(placement),
        hiringAuthority: this.buildHaObject(ha),
        company: this.buildCompanyObject(placement),
        recruiter: this.buileRecruiterObject(companySplits.length > 0 ? companySplits[0] : {}),
        status: this.buildStatusObject(placement),
        splits: this.buildSplitObject(placementSplits),
      };
    });
  }

  buildFeeObject(placement = {}) {
    const {
      fee_amount,
      fee_percentage,
      first_year_value,
      guarantee_days,
      fee_agreement_payment_scheme_id,
      monthly_amount,
    } = placement;
    const feeData = {
      amount: fee_amount,
      percentage: fee_percentage,
      firstYearValue: first_year_value,
      guaranteeDays: guarantee_days,
      paymentScheme: fee_agreement_payment_scheme_id,
    };
    if (fee_agreement_payment_scheme_id === 'conversion') {
      feeData.monthlyAmount = monthly_amount;
    }
    return feeData;
  }

  buildHaObject(hiring = {}) {
    const { full_name, email } = hiring;
    return {
      fullName: full_name,
      email,
    };
  }

  buildCompanyObject(placement = {}) {
    const {
      company_id,
      company_name,
      company_zip,
      company_address,
      company_state,
      company_state_slug,
      company_city,
      company_country,
      company_country_slug,
    } = placement;
    return {
      id: company_id,
      name: company_name,
      location: {
        address: company_address,
        zipcode: company_zip,
        country: company_country,
        countrySlug: company_country_slug,
        state: company_state,
        stateSlug: company_state_slug,
        city: company_city,
      },
    };
  }

  buileRecruiterObject(user = {}) {
    const { user_id, user_email, user_initials, user_name } = user;
    return {
      id: user_id,
      email: user_email,
      name: user_name,
      initials: user_initials,
    };
  }

  buildStatusObject(placement = {}) {
    const { status_id, status_title } = placement;
    return {
      id: status_id,
      title: status_title,
    };
  }

  buildSplitObject(splits) {
    return splits.map((split) => {
      const { user_id, user_email, user_initials, user_name, is_channel_partner, type, split_percentage } = split;
      return {
        userId: user_id,
        userEmail: user_email,
        userInitials: user_initials,
        userName: user_name,
        isChannelPartner: is_channel_partner,
        percentage: split_percentage,
        type,
      };
    });
  }
}

module.exports = PlacementEstimateList;
