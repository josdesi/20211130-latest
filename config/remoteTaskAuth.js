'use strict';

/** @type {import('@adonisjs/framework/src/Env')} */
const Env = use('Env');

module.exports = {
  token: Env.get('REMOTE_TASKS_AUTH_TOKEN', ''),
};
