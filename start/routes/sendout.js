'use strict';

/** @type {typeof import('@adonisjs/framework/src/Route/Manager')} */
const Route = use('Route');

Route.group(() => {
  Route.get('/board','SendoutController.board');
  Route.get('/send-daily-leaders','SendoutController.sendDailyLeaders');
  Route.get('/send-unconverted', 'SendoutController.sendUnconvertedSendovers');

  Route.get('/cutoff-board-weekly','SendoutController.cutOffBoardWeekly');
  Route.get('/cutoff-goal-weekly','SendoutController.cutOffGoalWeekly');
})
  .middleware(['clientAppAuth'])
  .prefix('/api/v1/sendouts');

Route.group(() => {
  Route.get('/types', 'SendoutController.types');
  Route.get('/status-types', 'SendoutController.statuses');
  Route.get('/interview-types', 'SendoutController.interviewTypes');
  Route.get('/template', 'SendoutController.template');
  Route.post('/attachments', 'FileController.upload');
  Route.delete('/attachments/:id', 'FileController.destroy').validator('IdParam');

  Route.get('/', 'SendoutController.index');
  Route.get('/summary','SendoutController.summary');
  Route.get('/dashboard','SendoutController.dashboard');
  Route.get('/dashboard/weeks','SendoutController.dashboardWeeks');
  Route.get('/dashboard/recruiters','SendoutController.dashboardRecruiters');
  Route.get('/:id', 'SendoutController.show').validator('IdParam').validator('GetSendoutProfile');
  Route.get('/:id/file-types-to-create-placement', 'SendoutController.fileTypesForPlacement');
  Route.post('/', 'SendoutController.store').validator('StoreSendout');
  Route.put('/:id', 'SendoutController.update').validator('IdParam').validator('UpdateSendout');

  Route.delete('/:id', 'SendoutController.destroy').validator('IdParam');

  //Board
  Route.get('/board/config', 'SendoutController.boardConfiguration');

  //Placements
  Route.get('/:id/placements', 'SendoutController.placements');
})
  .middleware(['auth:jwt','statusActive'])
  .prefix('api/v1/sendouts');
