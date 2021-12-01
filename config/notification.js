'use strict';

/** @type {import('@adonisjs/framework/src/Env')} */
const Env = use('Env');

module.exports = {
  notificationsApiUrl: Env.get('NOTIFICATIONS_API_URL', ''),
  notificationsApiToken: Env.get('NOTIFICATIONS_API_TOKEN', ''),
  coachesIds: Env.get('COACHES_IDS', '[]'),
};
