'use strict';

/*
|--------------------------------------------------------------------------
| Candidate Routes
|--------------------------------------------------------------------------
|
| Http routes are entry points to your web application. You can create
| routes for different URLs and bind Controller actions to them.
|
| A complete guide on routing is available here.
| http://adonisjs.com/docs/4.1/routing
|
*/

/** @type {typeof import('@adonisjs/framework/src/Route/Manager')} */
const Route = use('Route');

Route.group(() => {
  //Sources
  Route.get('/source-types', 'SourceTypeController.index');
  
  //Status
  Route.get('/statuses', 'CandidateController.statuses').validator('GetStatuses');

  //Suggest Company
  Route.get('/:id/suggested-companies', 'CandidateController.indexSuggestedCompanies').validator('GetSuggestedCandidateCompanies');

  //Item
  Route.get('/', 'CandidateController.index').validator('PaginateParam');
  Route.get('/:id', 'CandidateController.show').validator('IdParam');
  Route.post('', 'CandidateController.store').validator('StoreCandidate');
  Route.put('/:id', 'CandidateController.update').validator('IdParam').validator('UpdateCandidate');
  Route.post('/fromName/:id', 'CandidateController.storeFromName').validator('StoreCandidate');
  Route.get('/getAssignmentHistory/:id', 'CandidateController.getAssignmentHistory').validator('IdParam');
  Route.put('reassign/:id', 'CandidateController.reassign').validator('IdParam').validator('StoreRecruiterAssign');

  //Files
  Route.post(':id/files', 'CandidateController.storeFile');
  Route.delete(':id/files/:fileId', 'CandidateController.deleteFile');

  //Notes
  Route.post('/:id/notes', 'CandidateController.storeNote').validator('IdParam').validator('StoreNote');
  Route.put('/:candidateId/notes/:id', 'CandidateController.updateNote').validator('StoreNote');
  Route.delete('/:candidateId/notes/:id', 'CandidateController.destroyNote');

  //Activity Logs
  Route.post('/:id/activityLogs', 'CandidateController.storeActivityLog')
    .validator('IdParam')
    .validator('StoreActivityLog');
  Route.put('/:candidateId/activityLogs/:id', 'CandidateController.updateActivityLog').validator('StoreActivityLog');
  Route.delete('/:candidateId/activityLogs/:id', 'CandidateController.destroyActivityLog');

  //BlueSheet
  Route.put('/:id/blueSheets/:blueSheetId', 'CandidateController.updateBlueSheet').validator('UpdateBlueSheet');
  Route.get('/bluesheets/timetypes', 'CandidateController.timeStartTypes');
  Route.get('/bluesheets/candidatetypes', 'CandidateController.candidateTypes');

  //Reference Release
  Route.post('/:id/reference-releases', 'CandidateController.sendReferenceRelease').validator('StoreReferenceRelease');
  Route.get('/reference-releases/template', 'CandidateController.referenceTemplate');
  Route.get('/:id/reference-releases', 'CandidateController.referenceReleases');

  //Logs
  Route.get('/:id/logs', 'CandidateController.getChangeLogs');

  //Job Order Assignation
  Route.get('/:id/job-orders-to-assign', 'CandidateController.jobOrdersToAssign').validator('IdParam');
  Route.post('/:id/assign-job-order', 'CandidateController.assignJobOrder').validator('LinkCandidateWithJobOrdeer');
  Route.delete('/:id/remove-job-order/:jobOrderId', 'CandidateController.removeJobOrder');

  //EmployerCompany
  Route.post('/:id/employer-company', 'CandidateController.storeEmployerCompany').validator('StoreCandidateEmployerCompany').middleware(['UserHasCandidateModifyAuthorization']);

  //Metrics
  Route.get('/metrics/Byuser', 'CandidateController.metricsByUser');
  Route.get('/:id/metrics', 'CandidateController.operatingMetrics');

  //Additional Recruiters
  Route.post('/:id/additional-recruiters','CandidateController.requestAdditionalRecruiter').validator('StoreAdditionalRecruiter');
  Route.put('/:id/additional-recruiters/:requestId','CandidateController.updateAdditionalRecruiter').validator('StoreAdditionalRecruiter');
  Route.delete('/:id/additional-recruiters/:requestId','CandidateController.deleteAdditionalRecruiter');
  Route.get('/:id/additional-recruiters','CandidateController.additionalRecruitersInfo');
  
  //Placements
  Route.get('/:id/placements', 'CandidateController.placements');
})
  .middleware(['auth:jwt', 'statusActive'])
  .prefix('api/v1/candidates');

Route.group(() => {
  Route.get('/', 'SourceTypeController.index');
})
  .middleware(['auth:jwt', 'statusActive'])
  .prefix('api/v1/source-types');

/*
  This route is invoked from Azure Functions backend in order to register external phone activity logs
*/ 
Route.group(() => {
  Route.post('/:id/external/activityLogs','CandidateController.storeExternalActivityLog')
    .validator('IdParam')
    .validator('StoreActivityLog');
})
  .middleware(['clientAppAuth'])
  .prefix('/api/v1/candidates');
