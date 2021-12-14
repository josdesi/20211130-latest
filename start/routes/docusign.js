
'use strict'

/** @type {typeof import('@adonisjs/framework/src/Route/Manager')} */

const Route = use('Route')

Route
  .group(() => {
    Route.post('/events', 'DocuSignController.handleDocuSignEvent')
  })
  .middleware()
  .prefix('api/v1/docusign');

