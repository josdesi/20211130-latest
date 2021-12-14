'use strict';

/*
|--------------------------------------------------------------------------
| Bulk Email Routes
|--------------------------------------------------------------------------
*/

const Route = use('Route');

//Webhook route, it does not neth the Auth middleware since only signed request are allowed
Route.post('/sendgrid-webhook', 'SendgridWebhookController.sendgridWebhook').prefix('/api/v1/');

//Public unsubcribe method
Route.post('/bulk-unsubscribe', 'BulkEmailOptOutController.storeUnsubscribe')
  .validator('StoreBulkEmailUnsubscribe')
  .prefix('/api/v1');

Route.group(() => {
  // 1 - Drafts
  Route.delete('/drafts/:id/attachment', 'BulkEmailController.destroyAttachment').validator(
    'DeleteBulkEmailTemplateAttachment'
  );
  Route.get('/drafts', 'BulkEmailController.indexDrafts');
  Route.put('/drafts/:id', 'BulkEmailController.updateDraft').validator('UpdateDraftEmail');
  Route.delete('/drafts/:id', 'BulkEmailController.destroyDraft');

  // 2 - Metrics
  Route.get('/:id/metrics/download', 'BulkEmailMetricController.downloadMetric');
  Route.get('/:id/metrics', 'BulkEmailMetricController.index');

  // 3 - Opt-Outs
  Route.post('/opt-outs', 'BulkEmailOptOutController.store').validator('StoreBulkEmailOptOut').middleware('hasRole:Operations');
  Route.get('/opt-outs', 'BulkEmailOptOutController.index').validator('GetOptOuts').middleware('hasRole:Operations');
  Route.get('/opt-outs/search', 'BulkEmailOptOutController.search').middleware('hasRole:Operations');
  Route.get('/opt-outs/types', 'BulkEmailOptOutController.indexTypes').middleware('hasRole:Operations');
  Route.get('/opt-outs/reasons', 'BulkEmailOptOutController.indexReasons').middleware('hasRole:Operations');
  Route.get('/opt-outs/recruiters', 'BulkEmailOptOutController.indexRecruiters').middleware('hasRole:Operations');
  Route.delete('/opt-outs/:id', 'BulkEmailOptOutController.destroy').validator('DeleteBulkEmailOptOut').middleware('hasRole:Operations');

  // 4 - Schedules
  Route.delete('/schedules/:id/attachment', 'BulkEmailScheduleController.destroyAttachment');
  Route.put('/schedules/:id/send-date', 'BulkEmailScheduleController.updateSendDate').validator(
    'UpdateScheduledBulkEmailDate'
  );
  Route.post('/schedules', 'BulkEmailScheduleController.store').validator('StoreScheduledBulkEmail');
  Route.get('/schedules', 'BulkEmailScheduleController.index');
  Route.get('/schedules/:id', 'BulkEmailScheduleController.show');
  Route.put('/schedules/:id', 'BulkEmailScheduleController.update').validator('UpdateScheduledBulkEmailBody');
  Route.delete('/schedules/:id', 'BulkEmailScheduleController.destroy');

  // 5 - Folders
  Route.get('/folders', 'BulkEmailTemplateController.indexFolder');
  Route.put('/folders/:id', 'BulkEmailTemplateController.updateFolder').validator(
    'UpdateBulkEmailTemplateFolder'
  );
  Route.post('/folders', 'BulkEmailTemplateController.storeFolder').validator('StoreBulkEmailTemplateFolder');
  Route.delete('/folders/:id', 'BulkEmailTemplateController.destroyFolder');

  // 6 - Templates
  Route.delete('/templates/:id/attachment', 'BulkEmailTemplateController.destroyAttachment').validator(
    'DeleteBulkEmailTemplateAttachment'
  );
  Route.post('/templates', 'BulkEmailTemplateController.store').validator('StoreBulkEmailTemplate');
  Route.get('/templates', 'BulkEmailTemplateController.index');
  Route.get('/templates/:id', 'BulkEmailTemplateController.show');
  Route.put('/templates/:id', 'BulkEmailTemplateController.update').validator('UpdateBulkEmailTemplate');
  Route.delete('/templates/:id', 'BulkEmailTemplateController.destroy');

  Route.get('/smartags', 'BulkEmailTemplateController.indexSmartags');


  // 7 - Upload Attachment
  Route.post('/attachment', 'BulkEmailController.uploadAttachment');
  Route.post('/image', 'BulkEmailController.uploadImage');

  //8 - Preview
  Route.post('/preview/body', 'BulkEmailController.bodyPreview').validator('GetBodyPreview');

  // 9 - Bulk Emails
  Route.get('/scopes', 'BulkEmailController.indexScopes');
  Route.post('/', 'BulkEmailController.store').validator('StoreBulkEmail');
  Route.get('/', 'BulkEmailController.index');
  Route.get('/:id', 'BulkEmailController.show');
})
  .middleware(['auth:jwt', 'statusActive','hasPermission:bulkEmail.usage'])
  .prefix('/api/v1/bulk-emails');
