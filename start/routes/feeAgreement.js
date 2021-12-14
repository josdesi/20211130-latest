
'use strict'

/** @type {typeof import('@adonisjs/framework/src/Route/Manager')} */

const Route = use('Route')

Route.group(() => {
  Route.get('/send-unsigned', 'FeeAgreementController.sendUnsignedAgreements');
  Route.get('/expire-sent-fee-agreements', 'FeeAgreementController.expireFeeAgreements');
})
  .middleware(['clientAppAuth'])
  .prefix('api/v1/fee-agreements');

Route
  .group(() => {
    Route.get('/', 'FeeAgreementController.index').validator('ListFeeAgreements');
    Route.get('/fee-agreement-statuses', 'FeeAgreementController.getFeeAgreementStatuses');
    Route.get('/get-contract-templates', 'FeeAgreementController.getContractTemplates');
    Route.get('/get-responsible-roles', 'FeeAgreementController.getResponsibleRoles');
    Route.get('/get-summary-by-status', 'FeeAgreementController.getCountSummaryByStatus');
    Route.get('/fee-agreement-guarantee-days-options', 'FeeAgreementController.getFeeAgreementGuaranteeDaysOptions');
    Route.get('/active-by-company', 'FeeAgreementController.getSignedFeeAgreementsByCompany');
    Route.get('/fee-agreement-guarantee-days-options-by-payment-scheme', 'FeeAgreementController.getFeeAgreementGuaranteeDaysOptionsByPaymentScheme');
    Route.get('/:id/pdf-preview', 'FeeAgreementController.show').validator('IdParam');
    Route.get('/:id/history-log', 'FeeAgreementController.getHistoryLog').validator('IdParam');
    Route.put('/:id/void-contract', 'FeeAgreementController.voidContract').validator('VoidFeeAgreement');
    Route.put('/:id/cancel-validation-request', 'FeeAgreementController.cancelValidationRequest').validator('IdParam');
    Route.put('/:id/restore-expired', 'FeeAgreementController.restoreExpired').validator('IdParam');
    Route.put('/:id/switch-to-backup-service', 'FeeAgreementController.resendThroughDocuSign').validator('IdParam');
    

    Route.post('/create-template-draft', 'FeeAgreementController.createTemplateDraft');
    Route.post('/temporary-file', 'FeeAgreementController.createTemporaryFile');
    Route.get('/get-responsible-roles', 'FeeAgreementController.getResponsibleRoles');
    Route.get('/overridable-users', 'FeeAgreementController.getOverridableUsers');
    Route.get('/templates', 'FeeAgreementController.getTemplatesIds');
    Route.get('/templates/:id', 'FeeAgreementController.getTemplateFileByTemplateId');
    Route.get('/:id/template', 'FeeAgreementController.getTemplateFileByAgreementId');

    Route.get('/:id', 'FeeAgreementController.show').validator('IdParam');

    Route.post('/:id/coach-validation', 'FeeAgreementController.coachValidation').validator('IdParam');
    Route.post('/:id/coach-declination', 'FeeAgreementController.coachDeclination').validator('DeclineFeeAgreement');
    Route.put('/:id/send-to-coach-validation', 'FeeAgreementController.sendToCoachValidation').validator('SendFeeAgreementToRegionalDirectorValidation');

    Route.post('/:id/operations-validation', 'FeeAgreementController.operationsValidation').validator('IdParam');
    Route.post('/:id/operations-validation-for-unmanaged', 'FeeAgreementController.operationsValidationForUnmanaged').validator('IdParam');
    Route.post('/:id/operations-declination', 'FeeAgreementController.operationsDeclination').validator('DeclineFeeAgreement');
    Route.put('/:id/send-to-operations-validation', 'FeeAgreementController.sendToOperationsValidation').validator('SendFeeAgreementToRegionalDirectorValidation');

    Route.post('/:id/send-reminder', 'FeeAgreementController.sendReminder');
    Route.post('/:id/create-signature-request-preview', 'FeeAgreementController.createSignatureRequestPreview');
    Route.put('/:id/emails', 'FeeAgreementController.updateEmails').validator('IdParam').validator('UpdateFeeAgreementEmail');
  })
  .middleware(['auth:jwt'])
  .prefix('api/v1/fee-agreements');

  Route
  .group(() => {
    Route.post('/process-hellosign-event-c2VjdXJlX3JhbmRvbV9mb3JtYXRfanVhc2p1YXNqdWFzanVhc2p1YXM', 'FeeAgreementController.processHelloSignEvent');
  })
  .prefix('api/v1/fee-agreements');
