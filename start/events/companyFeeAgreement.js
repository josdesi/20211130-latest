/*
|--------------------------------------------------------------------------
| CompanyFeeAgreement Events
|--------------------------------------------------------------------------
|
*/

const Event = use('Event');
const EventTypes = use('App/Helpers/Events');

Event.on(EventTypes.CompanyFeeAgreement.CreatedAndSentToSign, ['CompanyFeeAgreement.notifyStandardCreation']);
Event.on(EventTypes.CompanyFeeAgreement.CreatedAndSentToCoachValidation, ['CompanyFeeAgreement.notifyNonstandardCreation']);
Event.on(EventTypes.CompanyFeeAgreement.CreatedAndSentToOperationsValidation, ['CompanyFeeAgreement.notifyNonstandardCreationByCoach']);
Event.on(EventTypes.CompanyFeeAgreement.SignedByHiringAuthority, ['CompanyFeeAgreement.notifySignedByHiringAuthority']);
Event.on(EventTypes.CompanyFeeAgreement.SignedByProductionDirector, ['CompanyFeeAgreement.notifySignedByProductionDirector']);
Event.on(EventTypes.CompanyFeeAgreement.ValidatedByCoach, ['CompanyFeeAgreement.notifyValidatedByCoach']);
Event.on(EventTypes.CompanyFeeAgreement.DeclinedByCoach, ['CompanyFeeAgreement.notifyDeclinedByCoach']);
Event.on(EventTypes.CompanyFeeAgreement.SentToCoachValidation, ['CompanyFeeAgreement.notifySentToCoachValidation']);
Event.on(EventTypes.CompanyFeeAgreement.ValidatedByOperationsAndSentToSign, ['CompanyFeeAgreement.notifyValidatedByOperationsAndSentToSign']);
Event.on(EventTypes.CompanyFeeAgreement.ValidatedByCoachAndSentToSign, ['CompanyFeeAgreement.notifyValidatedByCoachAndSentToSign']);
Event.on(EventTypes.CompanyFeeAgreement.DeclinedByOperations, ['CompanyFeeAgreement.notifyDeclinedByOperations']);
Event.on(EventTypes.CompanyFeeAgreement.SentToOperationsValidation, ['CompanyFeeAgreement.notifySentToOperationsValidation']);
Event.on(EventTypes.CompanyFeeAgreement.SignatureReminderSent, ['CompanyFeeAgreement.notifySignatureReminderSent']);
Event.on(EventTypes.CompanyFeeAgreement.SignatureRequestEmailBounced, ['CompanyFeeAgreement.notifySignatureRequestEmailBounced']);
Event.on(EventTypes.CompanyFeeAgreement.SentToOperationsValidation, ['CompanyFeeAgreement.notifyVoided']);
Event.on(EventTypes.CompanyFeeAgreement.Voided, ['CompanyFeeAgreement.notifySentToOperationsValidation']);
Event.on(EventTypes.CompanyFeeAgreement.AboutExpire, ['CompanyFeeAgreement.notifyAboutExpire']);
Event.on(EventTypes.CompanyFeeAgreement.Expired, ['CompanyFeeAgreement.notifyExpired']);
Event.on(EventTypes.CompanyFeeAgreement.SignedUnManaged, ['CompanyFeeAgreement.notifyCreatedUnmanagedByOperations']);
