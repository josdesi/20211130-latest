'use strict';


const notificationTypes = {
  Candidate: {
    Created : 'candidate:created',
    StatusUpdated: 'candidate:status:updated',
    BeforeOperatingRenew: 'candidate:before:operating:renew',
    OperatingMetricCompleted: 'candidate:operating:completed',
    OperatingMetricReminder: 'candidate:operating:reminder',
    OperatingMetricRenewed:'candidate:operating:renewed',
    JobOrderMatched: 'candidate:joborder:matched',
    AdditionalRecruiterRequested : 'candidate:additionalRecruiter:requested',
    AdditionalRecruiterRemoved: 'candidate:additionalRecruiter:removed',
    RecruiterAssigned: 'candidate:recruiter:assigned',
  },
  JobOrder: {
    Created : 'joborder:created',
    StatusUpdated: 'joborder:status:updated',
    BeforeOperatingRenew: 'joborder:before:operating:renew',
    OperatingMetricCompleted: 'joborder:operating:completed',
    OperatingMetricReminder: 'joborder:operating:reminder',
    OperatingMetricRenewed:'joborder:operating:renewed',
    CandidateMatched: 'joborder:candidate:matched',
    AdditionalRecruiterRequested : 'joborder:additionalRecruiter:requested',
    AdditionalRecruiterRemoved: 'joborder:additionalRecruiter:removed',
    RecruiterAssigned: 'joborder:recruiter:assigned',
  },
  Company: {
    Created: 'company:created',
    StatusUpdated: 'company:status:updated',
    Reassured: 'company:type:reassured',
    PendingReassureUpdated: 'company:type:PendingReassureUpdated',
    ReassureVerified: 'company:type:reassureVerified',
  },
  CompanyFeeAgreement: {
    CreatedAndSentToSign: 'companyfeeagreement:created:standard',
    CreatedNonStandard: 'companyfeeagreement:created:nonstandard',
    RegionalDirectorDeclines: 'companyfeeagreement:regionaldirector:declines',
    RecruiterSendsToRegionalDirectorValidation: 'companyfeeagreement:recruiter:sendstoregionaldirectorvalidation',
    RegionalDirectorValidates: 'companyfeeagreement:regionaldirector:validates',
    ProductionDirectorDeclines: 'companyfeeagreement:productiondirector:declines',
    RecruiterSendsToProductionDirectorValidation: 'companyfeeagreement:recruiter:sendstoproductiondirectorvalidation',
    ProductionDirectorValidates: 'companyfeeagreement:productiondirector:validates',
    ProductionDirectorValidatesWithVerbiageChanges: 'companyfeeagreement:productiondirector:validateswithverbiagechanges',
    OperationsSendsToSign: 'companyfeeagreement:operations:sendstosign',
    GetsSignedByHiringAuthority: 'companyfeeagreement:hiringauthority:signed',
    GetsSignedByProductionDirector: 'companyfeeagreement:productiondirector:signed',
    SignatureRequestEmailBounced: 'companyfeeagreement:signature:request:email:bounced',
    SignatureReminderSent: 'companyfeeagreement:signature:reminder:sent'
  },
  Placement: {
    Created: 'placement:created',
    SuggestionUpdate: 'placement:suggestion:updated',
    Approved: 'placement:approved',
    Updated: 'placement:updated',
  },
  Inventory: {
    MovedToOffice: 'inventory:moved:office'
  }
}

const notificationCategories = {
  INVENTORY : 'inventory',
  OPERATING_METRICS : 'operating_metrics',
  FEE_AGREEMENT : 'fee_agreement',
  SOCIAL : 'social'
}




module.exports = {
  notificationTypes,
  notificationCategories
};
