'use strict';

/** @type {import('@adonisjs/framework/src/Env')} */
const Env = use('Env');

module.exports = {
  apiKey: Env.get('HELLO_SIGN_API_KEY', ''),
  clientId: Env.get('HELLO_SIGN_CLIENT_ID', ''),
  testMode: Env.get('HELLO_SIGN_TEST_MODE', 'true'),
};
