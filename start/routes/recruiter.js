
'use strict'

/** @type {typeof import('@adonisjs/framework/src/Route/Manager')} */

const Route = use('Route')

Route
  .group(() => {
    Route.get('/byCoach', 'RecruiterController.byCoach')
    Route.get('/myTeam', 'RecruiterController.myTeam')
    Route.get('/myTeamAndIndustry', 'RecruiterController.myTeamAndIndustry')
  })
  .middleware(['auth:jwt','statusActive'])
  .prefix('api/v1/recruiters');

  
