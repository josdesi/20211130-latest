'use strict';

/*
|--------------------------------------------------------------------------
| JobOrder Routes
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
  //Status
  Route.get('/statuses', 'JobOrderController.statuses').validator('GetStatuses');;

  //Sources
  Route.get('/source-types', 'JobOrderSourceTypeController.index');
  

  //Item
  Route.get('/', 'JobOrderController.index');
  Route.post('', 'JobOrderController.store').validator('StoreJobOrder');
  Route.post('/replace-white-sheet', 'JobOrderController.replaceWhiteSheet');
  Route.get('/:id', 'JobOrderController.show').validator('IdParam');
  Route.put('/:id', 'JobOrderController.update').validator('IdParam').validator('UpdateJobOrder');
  Route.get('/getAssignmentHistory/:id', 'JobOrderController.getAssignmentHistory').validator('IdParam');

  //Files
  Route.post(':id/files', 'JobOrderController.storeFile');
  Route.delete(':id/files/:fileId', 'JobOrderController.deleteFile');

  //Notes
  Route.post('/:id/notes', 'JobOrderController.storeNote').validator('IdParam').validator('StoreNote');
  Route.put('/:jobOrderId/notes/:id', 'JobOrderController.updateNote').validator('StoreNote');
  Route.delete('/:jobOrderId/notes/:id', 'JobOrderController.destroyNote');

  //Activity Logs
  Route.post('/:id/activityLogs', 'JobOrderController.storeActivityLog')
    .validator('IdParam')
    .validator('StoreActivityLog');
  Route.put('/:jobOrderId/activityLogs/:id', 'JobOrderController.updateActivityLog').validator('StoreActivityLog');
  Route.delete('/:jobOrderId/activityLogs/:id', 'JobOrderController.destroyActivityLog');

  //WhiteSheet
  Route.put('/:id/whiteSheets/:whiteSheetId', 'JobOrderController.updateWhiteSheet').validator('UpdateWhiteSheet');
  Route.get('/whiteSheets/feetypes', 'JobOrderController.feeTypes');
  Route.get('/whiteSheets/jobordertypes', 'JobOrderController.jobOrderTypes');

  //Hiring Authority
  Route.delete('/:id/hiring-authorities/:hiring_authority_id', 'JobOrderController.deleteHiringAuthority');
  Route.post('/:id/hiring-authorities', 'JobOrderController.createAndAssignHiringAuthority').validator(
    'StoreHiringAuthority'
  );
  Route.put('/:id/hiring-authorities/:hiringAuthorityId', 'JobOrderController.updateAndAssignHiringAuthority');
  Route.get('/:id/available-hiring-authorities', 'JobOrderController.getAvailableHiringAuthoritiesAssingTo');

  //Recruiter
  Route.put('/reassign/:id', 'JobOrderController.assignRecruiter').validator('StoreRecruiterAssign');

  //Candidate Assignation
  Route.get('/:id/candidates-to-assign', 'JobOrderController.candidatesToAssign').validator('IdParam');
  Route.post('/:id/assign-candidate', 'JobOrderController.assignCandidate').validator('LinkCandidateWithJobOrdeer');
  Route.delete('/:id/remove-candidate/:candidateId', 'JobOrderController.removeCandidate');

  //Metric
  Route.get('/metrics/Byuser', 'JobOrderController.metricsByUser');
  Route.get('/:id/metrics', 'JobOrderController.operatingMetrics');

  //Additional Recruiters
  Route.post('/:id/additional-recruiters','JobOrderController.requestAdditionalRecruiter').validator('StoreAdditionalRecruiter');
  Route.put('/:id/additional-recruiters/:requestId','JobOrderController.updateAdditionalRecruiter').validator('StoreAdditionalRecruiter');
  Route.delete('/:id/additional-recruiters/:requestId','JobOrderController.deleteAdditionalRecruiter');
  Route.get('/:id/additional-recruiters','JobOrderController.additionalRecruitersInfo');

  //Placements
  Route.get('/:id/placements', 'JobOrderController.placements');

})
  .middleware(['auth:jwt', 'statusActive'])
  .prefix('api/v1/job-orders');
