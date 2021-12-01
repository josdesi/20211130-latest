'use strict';

/** @type {import('@adonisjs/framework/src/Env')} */
const Env = use('Env');

module.exports = {
  notificationsApiUrl: Env.get('NOTIFICATIONS_V2_API_URL', ''),
  notificationsApiToken: Env.get('NOTIFICATIONS_V2_API_TOKEN', ''),
};
