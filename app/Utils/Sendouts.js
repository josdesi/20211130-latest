'use strict';

const { SendoutTypesSchemes, SendoutEventType, activityLogTypes } = use('App/Helpers/Globals');

/**
 *
 * @param {*} param0
 * @returns
 */
const unWrapDeclinationDetails = ({ declined_fields, declination_notes }) => ({
  declined_fields,
  declination_notes,
});

/**
 *
 * @param {*} template
 * @param {*} signature
 * @returns
 */
const addRecruiterSignatureEmail = (template, signature) => template.replace('{{recruiter_signature}}', signature);

/**
 *
 * @param {*} typeId
 * @returns
 */
const getEventAndActivityByType = (typeId) => {
  return typeId === SendoutTypesSchemes.Sendout
    ? {
        eventId: SendoutEventType.CreatedSendout,
        message: 'Sendout',
        logId: activityLogTypes.Sendout,
      }
    : {
        eventId: SendoutEventType.CreatedSendover,
        message: 'Sendover',
        logId: activityLogTypes.Sendover,
      };
};

const DefaultEmailSendouts = {
  Operations: 'ops@gogpac.com',
  Sendouts: 'sendouts@gogpac.com',
  TestEmails: [
    'mario.moreno@gogpac.com',
    'jorge.felix@gogpac.com',
    'isidro.vasquez@gogpac.com',
    'roberto.deanda@gogpac.com',
    'kevin.velazquez@gogpac.com',
    'emilio.leon@gogpac.com',
    'francisco.regalado@gogpac.com',
    'diana.alonso@gogpac.com',
    'pablo.vargas@gogpac.com',
    'cristopher.tovilla@gogpac.com',
    'ezequiel.saldana@gogpac.com',
    'jacqueline.delariva@gogpac.com',
  ],
  TestTo: 'fphiring@gogpac.com',
  TestSendouts: 'fpsendouts@gogpac.com',
  TestOps: 'testops@gogpac.com',
};

/**
 *
 * @param {Array} emails
 * @returns {Array} remove and clean emails
 */
const removeAndCleanEmails = (emails) => {
  let arrEmails = emails.map((email) => email.toLowerCase());
  return arrEmails.filter((v, i) => arrEmails.indexOf(v) === i);
};

/**
 *
 * @param {*} emails
 * @param {*} to
 * @returns cc emails
 */
const getCcEmails = (emails, to) => {
  let cc = emails.filter((email) => email !== to && email !== DefaultEmailSendouts.Sendouts);
  return removeAndCleanEmails(cc);
};

/**
 *
 * @param {*} emails
 * @param {*} cc
 * @returns bcc emails
 */
const getBccEmails = (emails, cc) => {
  let bcc = emails.filter((email) => email !== DefaultEmailSendouts.Sendouts);
  bcc = removeAndCleanEmails(bcc);
  bcc = bcc.filter((email) => !cc.includes(email));
  return bcc;
};

/**
 *
 * @param {*} jobOrder
 * @param {*} candidate
 * @returns Industry emails
 */
const getindustryEmails = (jobOrder, candidate) => {
  const emails = [];

  jobOrder && jobOrder.industry_email && emails.push(jobOrder.industry_email);
  candidate && candidate.industry_email && emails.push(candidate.industry_email);

  return emails;
};

/**
 *
 * @param {*} jobOrderAccountableCoach
 * @param {*} candidateAccountableCoach
 * @returns Team emails
 */
const getTeamEmails = (jobOrderAccountableCoach, candidateAccountableCoach) => {
  const emails = [];

  jobOrderAccountableCoach && jobOrderAccountableCoach.email_team && emails.push(jobOrderAccountableCoach.email_team);

  candidateAccountableCoach &&
    candidateAccountableCoach.email_team &&
    emails.push(candidateAccountableCoach.email_team);

  return emails;
};

/**
 *
 * @param {*} jobOrderAccountable
 * @param {*} candidateAccountable
 * @returns Recruiter emails
 */
const getRecruiterEmails = (jobOrderAccountable, candidateAccountable) => {
  const emails = [];

  jobOrderAccountable && jobOrderAccountable.email && emails.push(jobOrderAccountable.email);
  candidateAccountable && candidateAccountable.email && emails.push(candidateAccountable.email);

  return emails;
};

/**
 *
 * @param {*} emails
 * @param {*} to
 * @returns Test emails
 */
const getTestEmails = (emails, to) => {
  let testEmails = emails.filter((email) => DefaultEmailSendouts.TestEmails.includes(email));
  testEmails = testEmails.filter((email) => email !== to);
  return testEmails;
};

module.exports = {
  DefaultEmailSendouts,
  unWrapDeclinationDetails,
  addRecruiterSignatureEmail,
  getEventAndActivityByType,
  getCcEmails,
  getBccEmails,
  getindustryEmails,
  getTeamEmails,
  getRecruiterEmails,
  getTestEmails,
};
