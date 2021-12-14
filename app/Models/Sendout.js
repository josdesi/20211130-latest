'use strict';

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model');
const Database = use('Database');

const { userFields, FeeAgreementStatus } = use('App/Helpers/Globals');

class Sendout extends Model {
  static boot () {
    super.boot()
    this.addTrait('@provider:Jsonable');
    this.addTrait('ModelQueryHelper');
  }

  static scopeWithCandidate(query) {
    return query.include([
      {
        relation: 'candidate',
        hideAuditFields:{ hideAuditFields : false },
        extend: [
          {
            method: 'select',
            params: ['id', 'title', 'email', 'personal_information_id', 'recruiter_id', 'source_type_id']  //Do not remove source_type_id unless source is no longer used on placements
          }
        ],
        load: [
          {
            relation: 'personalInformation',
            extend: [
              {
                method: 'select',
                params: ['id', 'full_name', 'contact_id', 'address_id']
              }
            ],
            load: [
              {
                relation: 'contact',
              },
              {
                relation: 'address.city.state.country',
              }
            ]
          },
          {
            relation: 'recruiter',
            extend: [
              {
                method: 'select',
                params: ['id', 'initials', 'email',' personal_information_id']
              }
            ],
            load: [
              {
                relation: 'personalInformation',
                extend: [
                  {
                    method: 'select',
                    params: ['id', 'full_name']
                  }
                ],
              }
            ]
          },
          {
            relation: 'additionalRecruiters',
            load: [
              {
                relation: 'recruiter',
                extend: [
                  {
                    method: 'select',
                    params: ['id', 'initials', 'email',' personal_information_id']
                  }
                ],
                load: [
                  {
                    relation: 'personalInformation',
                    extend: [
                      {
                        method: 'select',
                        params: ['id', 'full_name']
                      }
                    ],
                  }
                ]
              }
            ]
          }
        ]
      }
    ]);
  }

  static scopeWithInterviews(query) {
    return query.include([
      {
        relation: 'interviews',
        extend: [
          {
            method: 'orderBy',
            params: ['interview_date', 'asc']
          }
        ],
        load: [
          {
            relation: 'interviewType',
          }
        ]
      }
    ]);
  }

  static scopeWithHiringAuthorithies(query) {
    return query.include([
      {
        relation: 'hiringAuthorithies',
        hideAuditFields:{ fields :  ['hiring_authority_id'] },
        load: [
          {
            relation: 'hiringAuthority',
            hideFields:{ fields :  ['company_id'] }
          }
        ]
      }
    ]);
  }

  static scopeWithCompany(query) {
    return query.include([
      {
        relation: 'joborder',
        extend: [
          {
            method: 'select',
            params: ['id','company_id','recruiter_id','title','source','job_order_source_type_id'] //Do not remove job_order_source_type_id unless source is no longer used on placements
          }
        ],
        load: [
          {
            relation: 'company',
            extend: [
              {
                method: 'select',
                params: ['id','name','address','email','recruiter_id']
              }
            ],
            load: [
              {
                relation: 'recruiter',
                extend: [
                  {
                    method: 'select',
                    params: ['id', 'initials', 'email',' personal_information_id']
                  }
                ],
                load: [
                  {
                    relation: 'personalInformation',
                    extend: [
                      {
                        method: 'select',
                        params: ['id', 'full_name']
                      }
                    ],
                  }
                ]
              },
              {
                relation: 'feeAgreements',
                extend: [
                  {
                    method: 'select',
                    params: ['id', 'fee_percentage', 'fee_agreement_payment_scheme_id','flat_fee_amount','company_id','signed_date','fee_agreement_status_id','guarantee_days','pdf_url']
                  },
                  {
                    method: 'where',
                    params: ['fee_agreement_status_id', FeeAgreementStatus.Signed]
                  }
                ],
              }
            ]
          },
          {
            relation: 'files',
          },
          {
            relation: 'recruiter',
            extend: [
              {
                method: 'select',
                params: ['id', 'initials', 'email',' personal_information_id']
              }
            ],
            load: [
              {
                relation: 'personalInformation',
                extend: [
                  {
                    method: 'select',
                    params: ['id', 'full_name']
                  }
                ],
              }
            ]
          }
        ]
      }
    ]);
  }

  static scopeWithJobOrderAccountable(query) {
    return query.include([
      {
        relation: 'jobOrderAccountable',
        hideFields:{ fields : [...userFields, 'job_title'] },
        load: [
          {
            relation: 'personalInformation',
            extend: [
              {
                method: 'select',
                params: ['id', 'full_name']
              }
            ],
          }
        ]
      }
    ]);
  }

  static scopeWithCandidateAccountable(query) {
    return query.include([
      {
        relation: 'candidateAccountable',
        hideFields:{ fields : [...userFields, 'job_title'] },
        load: [
          {
            relation: 'personalInformation',
            extend: [
              {
                method: 'select',
                params: ['id', 'full_name']
              }
            ],
          }
        ]
      }
    ]);
  }

  type() {
    return this.belongsTo('App/Models/SendoutType');
  }

  status() {
    return this.belongsTo('App/Models/SendoutStatus');
  }

  candidate() {
    return this.belongsTo('App/Models/Candidate');
  }

  joborder() {
    return this.belongsTo('App/Models/JobOrder');
  }

  interviews() {
    return this.hasMany('App/Models/SendoutInterview');
  }

  attachments() {
    return this.hasMany('App/Models/SendoutAttachment');
  }

  hiringAuthorithies() {
    return this.hasMany('App/Models/SendoutHasHiringAuthority');
  }

  emailDetails() {
    return this.belongsTo('App/Models/SendoutEmailDetail', 'sendout_email_detail_id', 'id');
  }

  eventLogs() {
    return this.hasMany('App/Models/SendoutEventLog', 'id', 'sendout_id')
      .whereRaw('event_type_id is not null and event_type_id in (select id from sendout_event_types where show_in_history_log)')
      .orderBy(Database.raw('COALESCE(real_date, created_at)'), 'desc');
  }

  jobOrderAccountableDig(){
    return this.belongsTo('App/Models/RecruiterHasIndustry', 'job_order_accountable_id', 'recruiter_id');
  }

  candidateAccountableDig() {
    return this.belongsTo('App/Models/RecruiterHasIndustry', 'candidate_accountable_id', 'recruiter_id')
  }

  jobOrderAccountable() {
    return this.belongsTo('App/Models/User', 'job_order_accountable_id', 'id');
  }

  candidateAccountable() {
    return this.belongsTo('App/Models/User', 'candidate_accountable_id', 'id');
  }
}

module.exports = Sendout;
