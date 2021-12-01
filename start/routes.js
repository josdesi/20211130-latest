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

Route.get('/', () => {
  return { greeting: 'API FORTPAC v1' };
});

require('./routes/company');
require('./routes/candidate');
require('./routes/file');
require('./routes/dig');
require('./routes/search');
require('./routes/sendout');
require('./routes/jobOrder');
require('./routes/activityLogType');
require('./routes/user');
require('./routes/recruiter');
require('./routes/name');
require('./routes/workTypeOption');
require('./routes/hiringAuthorites');
require('./routes/dashboard');
require('./routes/notification');
require('./routes/feeAgreement');
require('./routes/role');
require('./routes/searchProject');
require('./routes/bulkEmail');
require('./routes/email');
require('./routes/migration');
require('./routes/modulePresetsConfig');
require('./routes/ace');
require('./routes/zipCode');
require('./routes/country');
require('./routes/placement');
require('./routes/phone');
require('./routes/sendover');
require('./routes/permission');
require('./routes/docusign');
require('./routes/bulkEmailDashboard');
require('./routes/example');
require('./routes/emailTrackingBlockList');
