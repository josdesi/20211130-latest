'use strict';

/*
|--------------------------------------------------------------------------
| Routes
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
  Route.get('/possible-employees', 'CompanyController.searchPossibleEmployees').validator('GetPossiblesEmployees');
  Route.get('/:id/employees', 'CompanyController.indexEmployees');

  Route.get('', 'CompanyController.index');
  Route.get('/duplicates', 'CompanyController.getDuplicates');  
  Route.get('/types', 'CompanyController.getCompanyTypes');
  Route.get('/:id', 'CompanyController.show').validator('IdParam');
  Route.post('', 'CompanyController.store').validator('StoreCompany');
  Route.put('/:id', 'CompanyController.update').validator('IdParam').validator('UpdateCompany');

  Route.get('/:id/hiring-authorities', 'CompanyController.hiringAuthorities');
  
  Route.post('/:id/hiring-authorities', 'CompanyController.createHiringAuthority').validator('StoreHiringAuthority');

  //Company type reassure
  Route.post('/:id/type-reassure', 'CompanyController.createTypeReassure').validator('StoreTypeReassure');
  Route.patch('/:id/type-reassure/:reassureId', 'CompanyController.updatePendingTypeReassure').validator('StoreTypeReassure');
  Route.post('/:id/type-reassure-ops-verification', 'CompanyController.createTypeReassureOpsVerifications').validator('StoreTypeReassureOpsVerification').middleware('hasRole:Operations');
  Route.get('/:id/pending-type-reassures', 'CompanyController.getPendingTypeReassures').middleware('hasRole:Operations');
  Route.get('/:id/type-reassure/:referenceId', 'CompanyController.getTypeReassureInformation').validator('GetTypeReassureInformation').middleware('hasRole:Operations');
  
  Route.post('/:id/notes','CompanyController.storeNote')
    .validator('IdParam')
    .validator('StoreNote')

  Route.put('/:companyId/notes/:id','CompanyController.updateNote')
    .validator('StoreNote')

  Route.delete('/:companyId/notes/:id','CompanyController.destroyNote')

  Route.post('/:id/activityLogs','CompanyController.storeActivityLog')
    .validator('IdParam')
    .validator('StoreActivityLog')

  Route.put('/:companyId/activityLogs/:id','CompanyController.updateActivityLog')
  .validator('StoreActivityLog')

  Route.delete('/:companyId/activityLogs/:id','CompanyController.destroyActivityLog')

  Route.put('/:companyId/hiring-authorities/:id', 'HiringAuthorityController.update')
    .validator('UpdateHiringAuthority')

  
  Route.delete('/:id/hiring-authorities/:hiringAuthorityId','CompanyController.deleteHiringAuthority')
  
  Route.put('reassign/:id', 'CompanyController.reassign')
    .validator('IdParam')
    .validator('StoreRecruiterAssign');

  Route.get('/getAssignmentHistory/:id', 'CompanyController.getAssignmentHistory').validator('IdParam');
  Route.get('/:id/fee-agreements','CompanyController.getFeeAgreements');
  Route.post('/:id/fee-agreements','CompanyController.storeFeeAgreement').validator('StoreFeeAgreement');
  Route.post('/:id/unmanaged-fee-agreements','CompanyController.createUnManagedFeeAgreement').validator('StoreUnmanagedFeeAgreement');


  Route.get('/:id/job-orders','CompanyController.getJobOrders');

  Route.put('/:id/hiring-authorities/:hiringAuthorityId/assign','CompanyController.updateAndAssignHiringAuthority');

  Route.post('/duplicates/merge','CompanyController.mergeDuplicated');
  //Files
  Route.post(':id/files', 'CompanyController.storeFile');
  Route.delete(':id/files/:fileId', 'CompanyController.deleteFile');
  Route.get(':id/files', 'CompanyController.getFiles');
})  
  .middleware(['auth:jwt','statusActive'])
  .prefix('api/v1/companies');

/*
  This route is invoked from Azure Functions backend in order to register external phone activity logs
*/ 
Route.group(() => {
  Route.post('/:id/external/activityLogs','CompanyController.storeExternalActivityLog')
    .validator('IdParam')
    .validator('StoreActivityLog');
})
  .middleware(['clientAppAuth'])
  .prefix('/api/v1/companies');

