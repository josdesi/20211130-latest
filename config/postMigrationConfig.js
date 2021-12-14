'use strict';

/** @type {import('@adonisjs/framework/src/Env')} */
const Env = use('Env');

module.exports = {
  apiUser: Env.get('DB_API_USER', ''),
};
