'use strict';

const referenceReleaseData = use('App/Utils/ReferenceEmailBody');
 
module.exports = {
  roster: {
    key: 'rosterRoles',
    data: [
      {
        title: 'Recruiter',
        id: 1,
      },
      {
        title: 'Coach',
        id: 2,
      },
      {
        title: 'Regional Director',
        id: 4,
      },
    ],
  },
  rosterOffices: {
    key: 'rosterOffices',
    data: [
      { title: 'Sioux Falls', address: '116 W. 69th Street Suite 200', state: 'SD', zip: '57108', country: 'US' },
      { title: 'Glendale', address: '6751 N. Sunset Boulevard Suite E290', state: 'AZ', zip: '85305', country: 'US' },
      { title: 'Reno', address: 'Mountain View 5470 Kietzke Lane', state: 'NV', zip: '89511', country: 'US' },
      { title: 'Denver', address: '3457 Ringsby Court Suite 111', state: 'CO', zip: '80216', country: 'US' },
      { title: 'Nashville', address: '2026 Lindell Avenue', state: 'TN', zip: '37203', country: 'US' },
      { title: 'Coon Rapids', address: '277 Coon Rapids Blvd Suite 309', state: 'MN', zip: '55433', country: 'US' },
      { title: 'Leon', address: 'Blvd Aeropuerto 849', state: 'GTO', zip: '37545', country: 'MX' },
      { title: 'Remote', address: 'Remote', state: null, zip: null, country: null },
    ],
  },
  migration: {
    key: 'migration',
    data: {
      coordinatorDataLeadEmail: 'valentina.esquivel@gogpac.com',
    },
  },
  companyTypeModal: {
    key: 'companyTypeModal',
    data: {
      stopAskingDate: new Date(Date.now()),
    },
  },
  similarityThreshold: {
    key: 'similarityThreshold',
    data: { value: 0.5 },
  },
  system: {
    key: 'system',
    data: {
      migrationEmail: 'gpc_migrations@gpac.com',//Used as default recruiter when migrating info
      apiEmail: 'fortpac@api.com',//Acts as the system user when assigning items from the API 
    },
  },
  referenceRelease: {
    key: 'referenceRelease',
    data: referenceReleaseData,
  },
  userGlipForWebHookMsg: {
    key: 'userGlipForWebHookMsg',
    data: {
      name: 'FortPac',
      iconUrl: 'https://gogpac.com/wp-content/uploads/2021/09/fortpac-logo-shield-red.png',
    },
  },
  sendoutsBoardConfiguration: {
    key: 'sendoutsBoardConfig',
    data: {
      id: 1,
      name: 'Sendouts Weekly Board',
      height: 910,
      width: '100%',
      reportUrl:
        'https://app.powerbi.com/reportEmbed?reportId=de5852d1-06b9-45d6-9106-92ab95452ab9&autoAuth=true&ctid=0698af7b-d43b-4bb3-9780-c16b7915f91d&config=eyJjbHVzdGVyVXJsIjoiaHR0cHM6Ly93YWJpLXVzLW5vcnRoLWNlbnRyYWwtZy1wcmltYXJ5LXJlZGlyZWN0LmFuYWx5c2lzLndpbmRvd3MubmV0LyJ9',
    }
  },
  timezone: {
    key: 'timezone',
    data: JSON.stringify([
      {
        timezone: 'Mountain Time'
      },
      {
        timezone: 'US Central Time'
      }
    ])
  }
};
