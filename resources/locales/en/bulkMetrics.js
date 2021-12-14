const flatten = use('flat');

const metric = {
  send: {
    delivered: 'Sendgrid delivered the email successfully',
  },
  spam: {
    group_unsubscribe: 'The recipient decided to unsubscribe from our bulk list',
    spamreport: 'The email sent to the recipient was reported as spam',
    default: 'The email could not be delivered',
  },
  blocked: {
    client: 'The email address belongs to a client Company',
    marketing: 'The email address belongs to a Hiring Authority related with the marketed Candidate',
    similarmarketing:
      'The email address belongs to a Hiring Authority who works in a similar Company to the one related with the marketed Candidate',
    clientsignedcompanymarketing:
      'The email address belongs to a Hiring Authority who works in a Company that is either signed or client',
    recruiting: 'The email address belongs to a Candidate that is our client',
    scope: "The email address' item type is not appropiate for this bulk's type",
    unsubscribe: 'The email address was blocked because the recipient is in the unsubscribed list',
    candidatestatus: 'The email address belongs to a Candidate already placed or inactive',
    optout: 'The email address was blocked by our opt-out system',
    default: 'The email could not be delivered',
  },
  sendgrid: {
    default: 'Sendgrid could not process the email',
  },
  invalid: {
    empty: "The recipient didn't have an email registered or it is malformed",
    withoutemployer: 'The recipient, Candidate, does not have an employer',
    withoutcompany: 'The recipient, Hiring Authority, does not have a primary company',
    blockresend: 'The recipient was blocked because block resend detected it as already contacted',
    failedrecipient: 'Fortpac could not send an email to this recipient',
    emailValidationAcceptAll:
      "This contact's email server can't confirm the email address existence yet. The verification process considered the contact as a potential spam trap and won't send an email this time. Server status: accept all",
    emailValidationUnknown:
      "This contact's email server determined that the email address can't be reached at this time. Server status: unknown",
    emailValidationInvalid:
      "This contact's email server determined the email address as nonexistent. Server status: invalid",
    default: 'The email could not be delivered to the recipient',
  },
};

module.exports = flatten(metric);
