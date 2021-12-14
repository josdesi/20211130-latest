'use strict';

/** @type {import('@adonisjs/framework/src/Env')} */
const Env = use('Env');

module.exports = {
  notificationsApiUrl: Env.get('NOTIFICATIONS_API_URL', ''),
  notificationsApiToken: Env.get('NOTIFICATIONS_API_TOKEN', ''),
  coachesIds: Env.get('COACHES_IDS', '[]'),
  replicate: Env.get('NOTIFICATIONS_REPLICATE', 'true'),
  versionToUse: Env.get('NOTIFICATIONS_VERSION_TO_USE', '1'),
};
