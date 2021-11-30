'use strict';

/** @type {import('@adonisjs/framework/src/Env')} */
const Env = use('Env');

module.exports = {
  apiKey: Env.get('BRITEVERIFY_EMAIL_VALIDATION_API_KEY'),
  url: Env.get('BRITEVERIFY_EMAIL_VALIDATION_URL'),
  urlV2: Env.get('BRITEVERIFY_V2_EMAIL_VALIDATION_URL'),
};
