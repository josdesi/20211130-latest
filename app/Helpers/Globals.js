'use strict';
const moment = use('moment');

const auditFields = ['created_at', 'updated_at', 'created_by', 'updated_by'];

const userFields = [
  'avatar',
  'double_authentication',
  'step_wizard',
  'personal_information_id',
  'user_status_id',
  'email_signature'
];

const personalInformationFields = [
  'id', //No need for they to know a indirect id
  'contact_id',
  'personal_information_id',
  'address_id',
];

const EntityTypes = {
  Candidate: 'candidate',
  JobOrder: 'joborder',
  Company: 'company',
  Name: 'name',
  HiringAuthority: 'hiringAuthority',
  HiringAuthorityOrName: 'hiringAuthorityOrName',
  Note: 'note',
  File: 'file',
  Activity: 'activity',
  Bluesheet: 'bluesheet',
  Whitesheet: 'whitesheet',
  Contact: 'contact',
  Placement: {
    default: 'placement',
    Invoice: 'invoice',
    Payment: 'payment'
  },
  User: 'user',
  EmailTrackingBlock: 'emailblock',
  Email: 'email',
  MicrosoftGraphAction: 'graphAction',
  Notification: 'notification',
  OptOut: 'optout',
  SearchProject: 'searchProject',
  SearchProjectItem: 'SPItem',
  FeeAgreement:'feeagreement',
  ReferenceRelease: 'referenceRelease'
};

const OperationType = {
  Create: 'create',
  Update: 'update',
  Delete: 'delete',
  Placement: {
    Approve: 'approve',
    SuggestedUpdate: 'suggested-update',
    RequestFallOff: 'request-fall-off',
    FallOff: 'fall-off',
    RequestRevertFallOff: 'request-revert-fall-off',
    RevertFallOff: 'revert-fall-off',
    MakeAdjustment: 'make-adjustment'
  },
  MicrosoftGraph:{
    SentEmail: 'sent-email',
    SentOnBehalfEmail: 'on-behalf-email',
  },
  Add: 'add',
  Sent: 'sent'
};

const FeeAgreementPaymentSchemes = {
  Standard: 'standard',
  Flat: 'flat',
  Conversion: 'conversion',
  BaseSalary: 'basesalary'
};

const JobOrderStatusSchemes = {
  Ongoing: 1,
  Sendout: 2,
  Sendover: 3,
  Placed: 4,
  Inactive: 5
};

const JobOrderTypeSchemes = {
  SearchAssignment: 0,
  Poejo: 1,
  CantHelp: 2
};

const CandidateStatusSchemes = {
  Ongoing: 1,
  Sendout: 2,
  Sendover: 3,
  Placed: 4,
  Inactive: 5
};

const CandidateTypeSchemes = {
  Alpha: 0,
  Poejo: 1,
  CantHelp: 2
}

const SendoutStatusSchemes = {
  Active: 1,
  Placed: 2,
  NoOffer: 3,
  Declined: 4,
  Sendover: 5,
  SendoverNoOffer: 6,
  SendoverDeclined: 7,
};

const SendoutTypesSchemes = {
  Sendout: 1,
  Sendover: 2
};

const SendoutInterviewTypesSchemes = {
  FaceToFace: 1,
  TelephoneOrVideo: 2
};

const StatusColorsSchemes = {
  Active: '#27AE60',
  Ongoing: '#27AE60',
  Sendout: '#4056F4',
  Sendover: '#4735C9',
  Placed: '#66CBCF',
  Inactive: '#9B9EA7',
  SearchAssignment: '#27AE60',
  Alpha: '#27AE60',
  Poejo: '#F39C12',
  CantHelp: '#E9250C'
};

const DateFormats = {
  SystemDefault: 'YYYY-MM-DD HH:mm:ss',
  OnlyDate: 'YYYY-MM-DD',
  AgendaFormat: 'YYYY-MM-DDTHH:mm:ss.SSSZ',
  DateSendout: 'MM-DD-YY hh:mm A',
  OnlyDateMonthDayYear: 'MM-DD-YY',
  OnlyTime: 'hh:mm A',
  Basic: 'MMDDYYYY'
};

const userRoles = {
  Recruiter: 1,
  Coach: 2,
  Admin: 3,
  RegionalDirector: 4,
  ProductionDirector: 5,
  Operations: 6,
  DataCoordinator: 7,
  Finance: 8
};

const userPermissions = {
  feeAgreements : {
    modifyGuarantee: 1,
    modifyPercentage: 2,
  },
  newFeeAgreements: {
    use: 3,
    manageTemplates: 4
  },
  modulePresetConfigs: {
    manage: 5
  },
  moduleContacts: {
    usage: 6
  },
  mobileApplication: {
    usage: 7
  },
  inventory: {
    overrideAssignment: 8
  },
  verificationModals: {
    usage: 9,
  },
  placements: {
    usage: 10,
    overrideApproval: 13 
  },
  sendout: {
    usage: 11
  },
  bulkEmail: {
    usage: 12
  },
  ringCentral: {
    usage: 14,
    glip: 15
  }
};

const feeAgreementType = {
  Contingency: 0,
  Retained: 1
}

const userStatus = {
  Active: 1,
  Inactive: 2,
  Absence: 3,
}

const clientAppStatuses = {
  Active: 1,
  Inactive: 0
}

const activityLogTypes = {
  BulkEmail : 0,
  Email: 1,
  SMS: 2,
  Call: 3,
  Sendout: 4,
  JobPosting:5,
  CheckPersonalInventory:6,
  CheckOfficeInventory:7,
  CheckPCRAndFortPacInventory:8,
  CreatePresentation:9,
  SendInmails:11,
  CreateRollOrAddRollUp:12,
  CreateCallPlan:13,
  GeneralUpdate:14,
  PendingOffer:15,
  OfferSent:16,
  OfferAccepted:17,
  ReferencesCompleted:18,
  ReferencesReleaseFormSent:19,
  Interview:20,
  Sendover:21,
  ZoomInfoEmail  :22,
  LinkedinMessages  :23,
  AlertsSetUp  :24,
  LinkedinStatusUpdate  :25,
  AutomaticCall: 26,
  AutomaticText: 27,
  ConversionOfSendover: 28,
  NoOffer: 29,
  Declined: 30,
  SendoverNoOffer: 31,
  SendoverDeclined: 32,
  Voicemail: 33,
  SendoutPlaced: 34,
  SendoutDeleted: 35,
  SendoverDeleted: 36,
}

const userFilters = {
  Mine : 0,
  MyIndustries : 1,
  MyTeam : 2,
  All : 3,
  MyCollaborations : 4,
  FreeGame: 5,
  MyInventory: 6,
  MyRegion: 7
}

const computedActivityStatus = (stand_by_date, inactive_date)=>{
  const todayDate = new Date(Date.now()).getTime()
  const standByDate = stand_by_date.getTime()
  const inactiveDate = inactive_date.getTime()
  if(todayDate>=standByDate && todayDate<inactiveDate){
    return activityStatus.StandBy
  }else if(todayDate>=inactiveDate){
    return activityStatus.Inactive
  }else{
    return activityStatus.Active
  }
}


const activityStatus = {
  Active: { id: 0 , title:'Active' , style:'active' },
  StandBy: { id: 1 ,title:'Stand By' , style:'standby' },
  Inactive: { id: 2 ,title:'Inactive' , style:'inactive' },
};

const nameTypes = {
  Name:0,
  Candidate:1,
  HiringAuthority:2
}

const granularityTimes = {
  Automatic:'automatic',
  OneHour:'1-hour',
  SixHours:'6-hour',
  TwelveHour:'12-hour',
  Day:'day',
  Week:'week',
  Month:'month',
}

const NotificationTargetDeviceType = {
  All :'all',
  Mobile: 'mobile',
  Desktop: 'desktop',
};

const nameStatus = {
  Name:{
    Undefined:0,
    Candidate:1,
    HiringAuthority:2
  },
  Candidate:{
    Ongoing: 3,
    Sendout: 4,
    Sendover: 5,
    Placed:6,
    Inactive:7,
    Unqualified:10,
  },
  HiringAuthority:{
    Active:8,
    Inactive:9
  }
}

const hiringAuthorityStatus = {
  Active: 1,
  Inactive: 0,
};
const formatData = {
  Chart:'chart',
  Table:'table'
}

const colorsFromEpic = [
  '#0274B3',
  '#E85900',
  '#F0D90F',
  '#E9250C',
  '#27AE60',
  '#70C3C9',
  '#242427'
]

const colorsChartsPhoneDashboard = {
  callColors: [
    '#27AE60',
    '#E85900',
    '#525764'
  ],
  SMSColors: [
    '#E85900',
    '#0472B3'
  ]
};

const FeeAgreementStatus = {
  PendingHiringAuthoritySignature: 1,
  PendingProductionDirectorSignature: 2,
  Signed: 3,
  PendingCoachValidation: 4,
  PendingOperationsValidation: 5,
  DeclinedByCoach: 6,
  DeclinedByOperations: 7,
  Expired: 8,
  Void: 9,
  Canceled: 10,
};


const FeeAgreementEventType = {
  CreatedAndSentToSign: 1,
  SignedByHiringAuthority: 2,
  SignedByProductionDirector: 3,
  CreatedAndSentToCoachValidation: 4,
  CreatedAndSentToOperationsValidation: 5,
  DeclinedByCoach: 6,
  SentToCoachValidation: 7,
  ValidatedByCoach: 8,
  DeclinedByOperations: 9,
  SentToOperationsValidation: 10,
  ValidatedByOperationsAndSentToSign: 11,
  VoidedByOperations: 12,
  VoidedByExpiration: 13,
  ReactivatedByOperations: 14,
  SignatureRequestPreviewCreated: 15,
  SignatureRequestViewedByHiringAuthority: 27,
  SignatureRequestOpenedByHiringAuthority: 39,
  SignatureRequestOpenedByProductionDirector: 40,
  SignatureRequestViewedByProductionDirector: 28,
  ValidationRequestCanceled: 32,
  SignatureReminderSent: 21,
  SignerEmailUpdated: 34,
  ValidatedByCoachAndSentToSign: 35,
  ValidatedByRegionalDirector: 36,
  ValidatedByRegionalDirectorAndSentToSign: 37,
  DeclinedByRegionalDirector: 38,
  AboutToExpire: 31,
  ValidationRequestCanceled: 32,
  Restored: 33,
  ResentWithDocuSign: 41,
  CreatedUnmanagedByOperations: 42,
  UnmanagedValidatedByOperations: 43,
  CreatedUnmanagedAndSentToOperationsValidation: 44,
  UpdatedByOperations: 45
};

const FeeAgreementTab = {
  PendingValidations: 0,
  PendingSignatures: 1,
  SignedFeeAgreements: 2
};
const countries = {
  US: {
    id: 1,
    title: 'United States of America',
    slug: 'US',
  },
  CA: {
    id: 2,
    title: 'Canada',
    slug: 'CA',
  },
  MX: {
    id: 3,
    title: 'Mexico',
    slug: 'MX',
  },
};

const SearchProjectTypes = {
  Candidate: 1,
  HiringAuthority: 2,
  Name: 3, //Otherwise known as 'Undefined'
  NameCandidate: 4,
  NameHA: 5,
}

const SmartagTypes = {
  recipient: 'recipient',
  sender: 'sender',
}

const Smartags = [
  { name: 'First Name (Recipient)', value: 'first_name', type: SmartagTypes.recipient },
  { name: 'Last Name (Recipient)', value: 'last_name', type: SmartagTypes.recipient },
  { name: 'Full Name (Recipient)', value: 'full_name', type: SmartagTypes.recipient },
  { name: 'Company Name (Recipient)', value: 'company_name', type: SmartagTypes.recipient },
  { name: 'Title (Recipient)', value: 'title', type: SmartagTypes.recipient },
  { name: 'Location (Recipient)', value: 'location', type: SmartagTypes.recipient },
  { name: 'State (Recipient)', value: 'state', type: SmartagTypes.recipient },
  { name: 'City (Recipient)', value: 'city', type: SmartagTypes.recipient },
  { name: 'Specialty (Recipient)', value: 'specialty', type: SmartagTypes.recipient },
  { name: 'Subspecialty (Recipient)', value: 'subspecialty', type: SmartagTypes.recipient },
  { name: 'Email (Recipient)', value: 'email', type: SmartagTypes.recipient },
  { name: 'Address (Recipient)', value: 'address', type: SmartagTypes.recipient },
  { name: 'Zip Code (Recipient)', value: 'zip', type: SmartagTypes.recipient },
  // { name: 'recipient phone number', value: 'phone', type: SmartagTypes.recipient },
  // { name: 'recipient phone ext', value: 'ext', type: SmartagTypes.recipient },
  // { name: 'recipient mobile number', value: 'mobile', type: SmartagTypes.recipient },

  { name: 'Email Signature (Sender)', value: 'your_signature', type: SmartagTypes.sender },
  { name: 'Full Name (Sender)', value: 'your_full_name', type: SmartagTypes.sender },
  { name: 'First Name (Sender)', value: 'your_first_name', type: SmartagTypes.sender },
  { name: 'Last Name (Sender)', value: 'your_last_name', type: SmartagTypes.sender },
];

const EmailOptOutTypes = {
  Candidate: 1,
  HiringAuthority: 2,
  Names : 3,
  User : 4,
}

const BulkEmailScopeTypes = {
  Marketing: 1,
  Recruiting: 2,
  Global: 3,
}

const SendgridValidStatusCode = 202;

const BulkEmailSendgridCategory = 'Fortpac Bulk Email';

const SendgridEventTypes = { 
  //Delivered
  delivered: 'delivered', //Sendgrid delivered the email
  
  //Open
  open: 'open', //Sendgrid tells that someone opened the email

  //Spam
  spamreport: 'spamreport', //Sendgrid tells that the email was reported as spam
  group_unsubscribe: 'group_unsubscribe', //Sendgrid tells us that some one unsubscribed from us

  //Blocked
  client: 'client', //Should be already DEPRECATED
  marketing: 'marketing', //The email belongs to a hiring authority that is connected to the candidate being marketed
  similarmarketing: 'similarmarketing', //The email belongs to a hiring authority that is connected to the candidate being marketed
  clientsignedcompanymarketing: 'clientsignedcompanymarketing', //The HA belongs to company that is client or signed, & the bulk used on true the flag for block client companies
  recruiting: 'recruiting', //The email belongs to a candidate that is our client
  scope: 'scope', //Was removed because it does not belong to the scope, if it was marketing then candidates will be removed by scope, if it was recruiting then hiring will be removed by scope
  unsubscribe: 'unsubscribe', //The email is in the unsubscribe list, meaning him/herself removed the email from our 'bulking list'
  candidatestatus: 'candidatestatus', //The candidate recipient has an invalid status, meaning has Placed or Inactive status
  optout: 'opt_out', //The email is in the opt out list, meaning was added by a recruiter
  invalid: 'invalid', //Should be already DEPRECATED, used in the old emails that 'was deemed invalid'
  
  emailValidation: { //TODO: Overhaul all the events to be inside another object, allowing easier understanding of the variables, like this one
    acceptAll: 'emailValidation:acceptAll',
    unknown: 'emailValidation:unknown',
    invalid: 'emailValidation:invalid',
  },

  //Invalid
  empty: 'empty', //The email was empty
  withoutemployer: 'withoutemployer', //Was removed because the recipient (candidate) doesn't have an employer
  withoutcompany: 'withoutcompany', //Was removed because the recipient (hiring authority) doesn't have a company
  blockresend: 'blockresend',
  failedrecipient: 'failedrecipient', //Sendgrid could not send the email, this happens at request level

  //Sendgrid
  bounce: 'bounce', //Sendgrid tells that the email bounced off
  blocked: 'blocked', //Sendgrid tells that the email was blocked
  dropped: 'dropped', //Sendgrid tells that the email was dropped out
  drop: 'drop', //Sendgrid sometimes sends just 'drop' instead of 'dropped'
  group_resubscribe: 'group_resubscribe',
}

const SendgridBouncedEvents = [
  SendgridEventTypes.bounce,
  SendgridEventTypes.blocked,
  SendgridEventTypes.dropped,
  SendgridEventTypes.client,
  SendgridEventTypes.marketing,
  SendgridEventTypes.candidatestatus,
  SendgridEventTypes.similarmarketing,
  SendgridEventTypes.recruiting,
  SendgridEventTypes.empty,
  SendgridEventTypes.scope,
  SendgridEventTypes.withoutemployer,
  SendgridEventTypes.withoutcompany,
  SendgridEventTypes.blockresend,
  SendgridEventTypes.clientsignedcompanymarketing,
  SendgridEventTypes.optout,
  SendgridEventTypes.unsubscribe,
]

const TemplateFolder = {
  MaxLevel: 4
}

const UnsubscribeReasonTypes = {
  Recruiter: {
    id: 1,
    title: 'Recruiter',
  },
  User: {
    id: 2,
    title: 'User',
  }
};

const UnsubscribeReasons = [
  {
    id: 1,
    description: 'The user does not want to receive any more email',
    unsubscribe_reason_type_id: UnsubscribeReasonTypes.Recruiter.id
  },
  {
    id: 2,
    description: 'The user is not interested in the content',
    unsubscribe_reason_type_id: UnsubscribeReasonTypes.Recruiter.id
  },  
  {
    id: 3,
    description: 'The user thinks the emails is spam',
    unsubscribe_reason_type_id: UnsubscribeReasonTypes.Recruiter.id
  },  
  {
    id: 4,
    description: 'The user receives too much content',
    unsubscribe_reason_type_id: UnsubscribeReasonTypes.Recruiter.id
  },
  {
    id: 98, //It should be alaways the bottom
    description: 'Other',
    unsubscribe_reason_type_id: UnsubscribeReasonTypes.Recruiter.id,
    needs_custom_reason: true,
  },
  {
    id: 6,
    description: 'You send too many emails',
    unsubscribe_reason_type_id: UnsubscribeReasonTypes.User.id
  },
  {
    id: 7,
    description: 'The emails looks like spam',
    unsubscribe_reason_type_id: UnsubscribeReasonTypes.User.id
  },  
  {
    id: 8,
    description: 'You send irrelevant content',
    unsubscribe_reason_type_id: UnsubscribeReasonTypes.User.id
  },  
  {
    id: 9,
    description: 'I didn\'t know I was subscribed',
    unsubscribe_reason_type_id: UnsubscribeReasonTypes.User.id
  },
  {
    id: 99, //Should be always the bottom
    description: 'Other',
    unsubscribe_reason_type_id: UnsubscribeReasonTypes.User.id,
    needs_custom_reason: true,
  },
  {
    id: 11,
    description: 'Not specified',
    unsubscribe_reason_type_id: UnsubscribeReasonTypes.Recruiter.id
  },
];

const SendgridSuppressionGroups = {
  Bulking: {
    key: 'BulkingSuppressionGroup',
    id: 15606
  }
}

const BriteVerifyVerdicts = {
  valid: 'valid',
  acceptAll: 'accept_all',
  unknown: 'unknown',
  invalid: 'invalid',
}

const BriteVerifyBulkValidationStates = [
  { title: 'verifying', error: false, finished: false },
  { title: 'pending', error: false, finished: false },
  { title: 'complete', error: false, finished: true },
  { title: 'terminated', error: true, finished: false },
  { title: 'error', error: true, finished: false },
];

const Regex = { email: /^[a-zA-Z0-9.!#$%&’*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/ };

// It is in the form of {characterToUse: characterBeingSearched}, meaning that the (key) is what is going to replace the (value) is the regex
const charactersToEscape = {
  "''": /'/igm,
};

const escapeStringForPostgres = (string) => {
  let escapedString = string;

  for (const [value, regex] of Object.entries(charactersToEscape)) {
    escapedString = escapedString.replace(regex, value);
  }
  
  return escapedString;
}

const joinStringForQueryUsage = (array, escapeString = false) => { 
  let finalString = '(';
  for (const string of array) {
    const newString = escapeString ? escapeStringForPostgres(string) : string;

    if (finalString !== '(') {
      finalString = `${finalString},`;
    }
    finalString = `${finalString}'${newString}'`;
  }
  finalString = `${finalString})`;

  return finalString;
}

const AdditionalRecruiterTypes = {
  Collaborator: 'collaborator',
  Accountable: 'accountable'
}

const MicrosoftGraphErrorCodes = [
  'InvalidAuthenticationToken',
  'ErrorSendAsDenied',
]

const MicrosoftGraphSubscriptionTypes = {
  mail: {
    inbox: {
      key: 'inbox',
      value: "/me/mailfolders('inbox')/messages",
    },
    sent: {
      key: 'sent',
      value: "/me/mailfolders('sentitems')/messages",
    },
  },
};

const StandardFeeAgreementDeclinableField = [
  'guarantee_days',
  'fee_percentage',
  'verbiage_changes'
];

const FlatFeeAgreementDeclinableField = [
  'flat_fee_amount',
  'verbiage_changes',
  'guarantee_days',
];

const ConversionFeeAgreementDeclinableField = [
  'verbiage_changes'
];


const AdditionalRecruiterStatus = {
  Requested: 'requested',
  Approved: 'approved',
  Declined: 'declined',
  Inactive: 'inactive',
  Removed: 'removed'
}

const validFileFormats = {
  pdf: 'application/pdf'
};
const contentDispositionHeaderBuilders = {
  download: (fileName) => `attachment; filename="${encodeURI(fileName)}"`,
  view: (_) => `inline`
};
const applyUTFOffset = (date, timezoneHeaderValue) => {
  const offset = timezoneHeaderValue * -1;
  return moment.utc(date).utcOffset(offset, false).format('YYYY-MM-DD HH:mm:ss');
}

const companyType = {
  Vendor: 0,
  Client: 1,
  NotSigned: 2
}

const multipartConfig = {
  extnames: ['xlsx', 'csv', 'xls'],
};

const getSupportedSheetFormat = (format) =>{
  const validFormats = ['xls', 'xlsx', 'csv', 'ods'];
  const defaultFormat = 'csv';
  const passedFormat = format ? format.toLowerCase() : '';
  return validFormats.includes(passedFormat) ? passedFormat : defaultFormat;
}


const migrationType = {
  Company: 0,
  Contact: 1,
  SearchProject: 2
};

const SignatureProvider = {
  DocuSign: 'docuSign',
  HelloSign: 'helloSign'
};

const DocusignAuditEventActions = {
  Viewed: 'Viewed',
  Signed: 'Signed',
  Opened: 'Opened',
};
const parseDateWithOffset = (inputDate, timezone) => {
  return inputDate ? applyUTFOffset(inputDate, timezone) : null;
}

const dataRCTypes = {
  InboundCall: {filterName: 'direction', filterValue: ['Inbound'], propertyName: 'inbound_calls'},
  OutboundCall: {filterName: 'direction', filterValue: ['Outbound'], propertyName: 'outbound_calls'},
  InternalCall: {filterName: 'direction', filterValue: 'Internal', propertyName: 'internal_calls'},
  MissedCall: {filterName: 'result', filterValue: ['Missed', 'Reply'], propertyName: 'missed_calls'},
  AvgHandleTimeCall: {filterName: 'result', filterValue: ['Accepted', 'Call connected'], propertyName: 'avg_time_calls', operation: 'Average'},
  VoicemailCall: {filterName: 'result', filterValue: ['Voicemail'], propertyName: 'voicemail_calls'},
  RejectedCall: {filterName: 'result', filterValue: ['Rejected'], propertyName: 'rejected_calls'},
  TotalTimeCall: {filterName: 'result', filterValue: ['Accepted', 'Call connected'], propertyName: 'total_time_calls', operation: 'Sum'},

  InboundSMS: {filterName: 'direction', filterValue: ['Inbound'], propertyName: 'received_sms'},
  SentSMS: {filterName: 'direction', filterValue: ['Outbound'], propertyName: 'sent_sms'},
  ReceivedSMS: {filterName: 'message_status', filterValue: ['Received'], propertyName: 'received_sms'},
  ReadSMS: {filterName: 'read_status', filterValue: ['Read'], propertyName: 'read_sms'},
  UnreadSMS: {filterName: 'read_status', filterValue: ['Unread'], propertyName: 'unread_sms'}
}

const RCLogStatuses = {
  Successful: 1,
  Incomplete: 2,
  Error: 3
}

const SendoutTypesEmails = {
  Sendout: 'sendout',
  SendoutNotification: 'sendoutNotification',
  SendoverNotification: 'sendoverNotification'
};

const FeeAgreementSignerRole = {
  ProductionDirector: 'Gpac Production Director',
  HiringAuthority: 'Hiring Authority'
};

const FeeAgreementSignatureProcessType = {
  FortPacManaged: 'fortPacManaged',
  ExternalUnmanaged: 'externalUnmanaged'
};

const parseBoolean = (value) => {
  const stringMap = {
    'true': true,
    'false': false,
    '1': true,
    '0': false
  };

  return !!stringMap[value];
};

const SendoutReminderType = {
  HiringAuthority: 'Hiring Authority',
  Candidate: 'Candidate',
  JobOrderRecruiter: 'Job Order Recruiter',
  CandidateRecruiter: 'Candidate Recruiter'
};

const SendoutEventType = {
  CreatedSendout: 1,
  UpdatedJobOrder: 2,
  UpdatedCandidate: 3,
  InviteIcsToHiringAuthority: 4,
  EmailSentToHiringAuthority: 5,
  ErrorEmailSentToHiringAuthority: 6,
  ErrorEmailSentToHiringAuthorityNotValid: 7,
  ErrorEmailSentToHiringAuthorityBounced: 8,
  EmailResentToHiringAuthority: 9,
  OtherEmailSentToHiringAuthority: 10,
  EmailSentToOps: 11,
  ErrorEmailSentToOps: 12,
  CreatedReminderToHiringAuthority: 13,
  ReminderEmailSentToHiringAuthority: 14,
  ErrorReminderEmailSentToHiringAuthority: 15,
  CreatedReminderToCandidate: 16,
  ReminderEmailSentToCandidate: 17,
  ErrorReminderEmailSentToCandidate: 18,
  CreatedReminderToCandidateRecruiter: 19,
  ReminderEmailSentToCandidateRecruiter: 20,
  ErrorReminderEmailSentToCandidateRecruiter: 21,
  CreatedReminderToJobOrderRecruiter: 22,
  ReminderEmailSentToJobOrderRecruiter: 23,
  ErrorReminderEmailSentToJobOrderRecruiter: 24,
  CompanyNoOffer: 25,
  CandidateDeclined: 26,
  CreatedSendover: 27,
  NewReminders: 28,
  UpdateReminders: 29,
  DeleteReminders: 30,
  SendoverSwitchedEmail: 31,
  SendoverSwitchedwithoutEmail: 32,
  FirstReminderSentToCandidate: 33,
  SecondReminderSentToCandidate: 34,
  InterviewRemindersScheduled: 35,
  InterviewRemindersSent: 36,
  SendoverNoOffer: 37,
  SendoverDeclined: 38,
  SendoverActive: 39,
  SendoutActive: 40,
  SendoutPlaced: 41,
  FeeAmountEditionPlaced: 42,
  JobOrderAccountableEdited: 43,
  CandidateAccountableEdited: 44
};

const CandidateSourceURLTypes = {
  Monster: {
    id: 0,
    title: 'Monster'
  },
  LinkedIn: {
    id: 1,
    title: 'LinkedIn'
  },
  LinkedInRecruiter: {
    id: 2,
    title: 'LinkedIn Recruiter'
  },
  Glassdoor: {
    id: 3,
    title: 'Glassdoor'
  },
  Indeed: {
    id: 4,
    title: 'Indeed'
  },
  Bulk: {
    id: 5,
    title: 'Bulk'
  },
  PCRSearch: {
    id: 6,
    title: 'PCR Search'
  },
  Referral: {
    id: 7,
    title: 'Referral'
  },
  ZipRecruiter: {
    id: 8,
    title: 'ZipRecruiter'
  },
  ZoomInfo: {
    id: 9,
    title: 'ZoomInfo'
  },
  AgCareers: {
    id: 10,
    title: 'AgCareers'
  },
  Facebook: {
    id: 11,
    title: 'Facebook'
  },
  CareerBuilder: {
    id: 12,
    title: 'Career Builder'
  },
  TalentNetwork: {
    id: 13,
    title: 'Talent Network'
  },
  FreshDesk: {
    id: 14,
    title: 'FreshDesk'
  }
}

const JobOrderSourceURLTypes = {
  LinkedIn: {
    id: 0,
    title: 'LinkedIn'
  },
  LinkedInRecruiter: {
    id: 1,
    title: 'LinkedIn Recruiter'
  },
  IndeedJobSearch: {
    id: 3,
    title: 'Indeed Job Search'
  },
  BulkEmail: {
    id: 4,
    title: 'Bulk Email'
  },
  ColdCall: {
    id: 5,
    title: 'Cold Call'
  },
  Referral: {
    id: 6,
    title: 'Referral'
  },
  ZoomInfo: {
    id: 7,
    title: 'ZoomInfo'
  },
  AgCareers: {
    id: 8,
    title: 'AgCareers'
  },
  Facebook: {
    id: 9,
    title: 'Facebook'
  },
  RepeatClient: {
    id: 10,
    title: 'Repeat Client'
  }
}

const WebSocketNamespaces = {
  BulkEmail: '/bulk-email',
  Migration: '/migrations',
  PhoneActivityLog: '/phone-activity-log',
  DashboardPhoneLoading: '/dashboard-phone-loading',
  UserChanges: '/userChanges'
};

const FeeAgreementFileEntitySources = {
  TemporalFeeAgreementFile: 'feeagreement',
  CompanyFile: 'company',
};

const EventTypesByStatusRefuse = {
  [SendoutStatusSchemes.Declined]: SendoutEventType.CandidateDeclined,
  [SendoutStatusSchemes.NoOffer]: SendoutEventType.CompanyNoOffer,
  [SendoutStatusSchemes.SendoverDeclined]: SendoutEventType.SendoverDeclined,
  [SendoutStatusSchemes.SendoverNoOffer]: SendoutEventType.SendoverNoOffer,
  [SendoutStatusSchemes.Active]: SendoutEventType.SendoutActive,
  [SendoutStatusSchemes.Sendover]: SendoutEventType.SendoverActive,
};

const LogTypesBySendoutStatus = {
  [SendoutStatusSchemes.Active]: activityLogTypes.Sendout,
  [SendoutStatusSchemes.Declined]: activityLogTypes.Declined,
  [SendoutStatusSchemes.NoOffer]: activityLogTypes.NoOffer,
  [SendoutStatusSchemes.SendoverDeclined]: activityLogTypes.SendoverDeclined,
  [SendoutStatusSchemes.SendoverNoOffer]: activityLogTypes.SendoverNoOffer,
  [SendoutStatusSchemes.Placed]: activityLogTypes.SendoutPlaced,
};

const addToggler = (array) => array.map((item, index) => ({ ...item, toggler: index % 2 === 0 }));

const IanaTimezones = [
  {
    name: 'US Central Time',
    standardIana: 'America/Chicago'
  },
  {
    name: 'Mountain Time',
    standardIana: 'America/Denver'
  },
];

module.exports = {
  applyUTFOffset,
  auditFields,
  personalInformationFields,
  EntityTypes,
  DateFormats,
  userFields,
  JobOrderStatusSchemes,
  JobOrderTypeSchemes,
  CandidateStatusSchemes,
  CandidateTypeSchemes,
  SendoutStatusSchemes,
  SendoutTypesSchemes,
  SendoutInterviewTypesSchemes,
  StatusColorsSchemes,
  userRoles,
  getSupportedSheetFormat,
  feeAgreementType,
  userStatus,
  clientAppStatuses,
  activityLogTypes,
  userFilters,
  computedActivityStatus,
  activityStatus,
  nameTypes,
  nameStatus,
  formatData,
  granularityTimes,
  colorsFromEpic,
  colorsChartsPhoneDashboard,
  hiringAuthorityStatus,
  FeeAgreementStatus,
  FeeAgreementEventType,
  userPermissions,
  countries,
  SearchProjectTypes,
  UnsubscribeReasonTypes,
  UnsubscribeReasons,
  SmartagTypes,
  Smartags,
  EmailOptOutTypes,
  SendgridSuppressionGroups,
  BriteVerifyVerdicts,
  BriteVerifyBulkValidationStates,
  SendgridBouncedEvents,
  BulkEmailScopeTypes,
  SendgridEventTypes,
  SendgridValidStatusCode,
  BulkEmailSendgridCategory,
  TemplateFolder,
  Regex,
  OperationType,
  MicrosoftGraphErrorCodes,
  MicrosoftGraphSubscriptionTypes,
  AdditionalRecruiterTypes,
  StandardFeeAgreementDeclinableField,
  userPermissions,
  AdditionalRecruiterStatus,
  FeeAgreementTab,
  FeeAgreementPaymentSchemes,
  FlatFeeAgreementDeclinableField,
  ConversionFeeAgreementDeclinableField,
  validFileFormats,
  contentDispositionHeaderBuilders,
  companyType,
  multipartConfig,
  migrationType,
  NotificationTargetDeviceType,
  SignatureProvider,
  joinStringForQueryUsage,
  parseDateWithOffset,
  dataRCTypes,
  RCLogStatuses,
  DocusignAuditEventActions,
  WebSocketNamespaces,
  SendoutTypesEmails,
  parseBoolean,
  FeeAgreementSignerRole,
  SendoutReminderType,
  SendoutEventType,
  FeeAgreementSignatureProcessType,
  FeeAgreementFileEntitySources,
  CandidateSourceURLTypes,
  JobOrderSourceURLTypes,
  LogTypesBySendoutStatus,
  EventTypesByStatusRefuse,
  IanaTimezones,
  addToggler,
};
